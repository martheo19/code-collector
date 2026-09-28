
CREATE TYPE public.card_rarity AS ENUM ('commune','peu_commune','rare','epique','legendaire');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref TEXT NOT NULL UNIQUE,
  source_code TEXT NOT NULL,
  article TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  rarity public.card_rarity NOT NULL DEFAULT 'commune',
  base_value INTEGER NOT NULL DEFAULT 50,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cards TO anon, authenticated;
GRANT ALL ON public.cards TO service_role;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cards_public_read" ON public.cards FOR SELECT USING (true);

CREATE TABLE public.user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_cards_user_idx ON public.user_cards(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_cards TO authenticated;
GRANT ALL ON public.user_cards TO service_role;
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_cards_own" ON public.user_cards FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_card_id UUID NOT NULL UNIQUE REFERENCES public.user_cards(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  price INTEGER NOT NULL CHECK (price > 0),
  status TEXT NOT NULL DEFAULT 'active',
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX listings_status_idx ON public.listings(status);
GRANT SELECT ON public.listings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listings_public_read" ON public.listings FOR SELECT USING (true);

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX transactions_user_idx ON public.transactions(user_id, created_at DESC);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_own" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER cards_updated BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER user_cards_updated BEFORE UPDATE ON public.user_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER listings_updated BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base TEXT; candidate TEXT; n INT := 0;
BEGIN
  base := COALESCE(NULLIF(NEW.raw_user_meta_data->>'username',''), split_part(COALESCE(NEW.email,'juriste'),'@',1));
  base := left(regexp_replace(base, '[^a-zA-Z0-9_\-]', '', 'g'), 20);
  IF base = '' THEN base := 'juriste'; END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    n := n + 1; candidate := base || n::text;
  END LOOP;
  INSERT INTO public.profiles (id, username) VALUES (NEW.id, candidate);
  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (NEW.id, 'bonus', 1000, 'Dotation de bienvenue');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.random_rarity()
RETURNS public.card_rarity LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE r NUMERIC := random();
BEGIN
  IF r < 0.55 THEN RETURN 'commune';
  ELSIF r < 0.82 THEN RETURN 'peu_commune';
  ELSIF r < 0.94 THEN RETURN 'rare';
  ELSIF r < 0.99 THEN RETURN 'epique';
  ELSE RETURN 'legendaire'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.open_booster()
RETURNS TABLE (user_card_id UUID, card_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID := auth.uid(); v_cost INT := 150; i INT; r public.card_rarity; c public.cards%ROWTYPE; uc UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  UPDATE public.profiles SET balance = balance - v_cost WHERE id = v_user AND balance >= v_cost;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (v_user, 'booster', -v_cost, 'Ouverture d''un booster');
  FOR i IN 1..3 LOOP
    r := public.random_rarity();
    SELECT * INTO c FROM public.cards WHERE rarity = r ORDER BY random() LIMIT 1;
    IF c.id IS NULL THEN SELECT * INTO c FROM public.cards ORDER BY random() LIMIT 1; END IF;
    IF c.id IS NULL THEN RAISE EXCEPTION 'Catalogue vide'; END IF;
    INSERT INTO public.user_cards (user_id, card_id) VALUES (v_user, c.id) RETURNING id INTO uc;
    user_card_id := uc; card_id := c.id; RETURN NEXT;
  END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.open_booster() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_booster() TO authenticated;

CREATE OR REPLACE FUNCTION public.create_listing(p_user_card_id UUID, p_price INTEGER)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID := auth.uid(); v_card UUID; v_id UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF p_price IS NULL OR p_price < 1 OR p_price > 1000000 THEN RAISE EXCEPTION 'Prix invalide'; END IF;
  SELECT card_id INTO v_card FROM public.user_cards WHERE id = p_user_card_id AND user_id = v_user;
  IF v_card IS NULL THEN RAISE EXCEPTION 'Carte introuvable'; END IF;
  IF EXISTS (SELECT 1 FROM public.listings WHERE user_card_id = p_user_card_id AND status = 'active') THEN
    RAISE EXCEPTION 'Carte déjà en vente';
  END IF;
  DELETE FROM public.listings WHERE user_card_id = p_user_card_id AND status <> 'active';
  INSERT INTO public.listings (seller_id, user_card_id, card_id, price)
  VALUES (v_user, p_user_card_id, v_card, p_price) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_listing(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_listing(UUID, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_listing(p_listing_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  UPDATE public.listings SET status = 'cancelled'
  WHERE id = p_listing_id AND seller_id = v_user AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Annonce introuvable'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.cancel_listing(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_listing(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.buy_listing(p_listing_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID := auth.uid(); l public.listings%ROWTYPE; t TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  SELECT * INTO l FROM public.listings WHERE id = p_listing_id AND status = 'active' FOR UPDATE;
  IF l.id IS NULL THEN RAISE EXCEPTION 'Annonce indisponible'; END IF;
  IF l.seller_id = v_user THEN RAISE EXCEPTION 'Vous ne pouvez pas acheter votre propre annonce'; END IF;
  UPDATE public.profiles SET balance = balance - l.price WHERE id = v_user AND balance >= l.price;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
  UPDATE public.profiles SET balance = balance + l.price WHERE id = l.seller_id;
  UPDATE public.user_cards SET user_id = v_user, acquired_at = now() WHERE id = l.user_card_id;
  UPDATE public.listings SET status = 'sold', buyer_id = v_user, sold_at = now() WHERE id = l.id;
  SELECT title INTO t FROM public.cards WHERE id = l.card_id;
  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (v_user, 'achat', -l.price, 'Achat : ' || COALESCE(t,'carte')),
         (l.seller_id, 'vente', l.price, 'Vente : ' || COALESCE(t,'carte'));
END; $$;
REVOKE ALL ON FUNCTION public.buy_listing(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buy_listing(UUID) TO authenticated;

INSERT INTO public.cards (ref, source_code, article, title, content, rarity, base_value, source_url) VALUES
('CC-1','Code civil','Article 1','Entrée en vigueur des lois','Les lois et, lorsqu''ils sont publiés au Journal officiel de la République française, les actes administratifs entrent en vigueur à la date qu''ils fixent ou, à défaut, le lendemain de leur publication.','peu_commune',120,'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006419280'),
('CC-9','Code civil','Article 9','Respect de la vie privée','Chacun a droit au respect de sa vie privée.','legendaire',900,'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006419288'),
('CC-16','Code civil','Article 16','Primauté de la personne','La loi assure la primauté de la personne, interdit toute atteinte à la dignité de celle-ci et garantit le respect de l''être humain dès le commencement de sa vie.','legendaire',950,'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006419287'),
('CC-144','Code civil','Article 144','Âge du mariage','Le mariage ne peut être contracté avant dix-huit ans révolus.','commune',60,NULL),
('CC-212','Code civil','Article 212','Devoirs des époux','Les époux se doivent mutuellement respect, fidélité, secours, assistance.','rare',320,NULL),
('CC-371','Code civil','Article 371','Honneur et respect','L''enfant, à tout âge, doit honneur et respect à ses père et mère.','peu_commune',140,NULL),
('CC-515-8','Code civil','Article 515-8','Concubinage','Le concubinage est une union de fait, caractérisée par une vie commune présentant un caractère de stabilité et de continuité, entre deux personnes, de sexe différent ou de même sexe, qui vivent en couple.','rare',300,NULL),
('CC-544','Code civil','Article 544','Droit de propriété','La propriété est le droit de jouir et disposer des choses de la manière la plus absolue, pourvu qu''on n''en fasse pas un usage prohibé par les lois ou par les règlements.','legendaire',1000,'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006428859'),
('CC-552','Code civil','Article 552','Propriété du dessus et du dessous','La propriété du sol emporte la propriété du dessus et du dessous.','epique',520,NULL),
('CC-1103','Code civil','Article 1103','Force obligatoire du contrat','Les contrats légalement formés tiennent lieu de loi à ceux qui les ont faits.','epique',600,NULL),
('CC-1104','Code civil','Article 1104','Bonne foi','Les contrats doivent être négociés, formés et exécutés de bonne foi. Cette disposition est d''ordre public.','rare',340,NULL),
('CC-1240','Code civil','Article 1240','Responsabilité civile','Tout fait quelconque de l''homme, qui cause à autrui un dommage, oblige celui par la faute duquel il est arrivé à le réparer.','legendaire',980,'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032041571'),
('CC-1241','Code civil','Article 1241','Négligence et imprudence','Chacun est responsable du dommage qu''il a causé non seulement par son fait, mais encore par sa négligence ou par son imprudence.','epique',540,NULL),
('CC-1382','Code civil','Article 1382 (ancien)','Ancêtre de la responsabilité','Tout fait quelconque de l''homme, qui cause à autrui un dommage, oblige celui par la faute duquel il est arrivé à le réparer.','epique',560,NULL),
('CC-2258','Code civil','Article 2258','Prescription acquisitive','La prescription acquisitive est un moyen d''acquérir un bien ou un droit par l''effet de la possession sans que celui qui l''allègue soit obligé d''en rapporter un titre.','rare',280,NULL),
('CONST-1','Constitution de 1958','Article 1er','République indivisible','La France est une République indivisible, laïque, démocratique et sociale. Elle assure l''égalité devant la loi de tous les citoyens sans distinction d''origine, de race ou de religion.','legendaire',1000,'https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000019240995'),
('CONST-2','Constitution de 1958','Article 2','Langue, emblème, devise','La langue de la République est le français. L''emblème national est le drapeau tricolore, bleu, blanc, rouge. L''hymne national est la Marseillaise. La devise de la République est « Liberté, Égalité, Fraternité ».','epique',700,NULL),
('CONST-3','Constitution de 1958','Article 3','Souveraineté nationale','La souveraineté nationale appartient au peuple qui l''exerce par ses représentants et par la voie du référendum.','epique',620,NULL),
('CONST-5','Constitution de 1958','Article 5','Rôle du Président','Le Président de la République veille au respect de la Constitution. Il assure, par son arbitrage, le fonctionnement régulier des pouvoirs publics ainsi que la continuité de l''État.','rare',380,NULL),
('CONST-16','Constitution de 1958','Article 16','Pouvoirs exceptionnels','Lorsque les institutions de la République sont menacées d''une manière grave et immédiate, le Président de la République prend les mesures exigées par ces circonstances.','legendaire',1100,NULL),
('CONST-20','Constitution de 1958','Article 20','Le Gouvernement','Le Gouvernement détermine et conduit la politique de la Nation. Il dispose de l''administration et de la force armée.','rare',350,NULL),
('CONST-34','Constitution de 1958','Article 34','Domaine de la loi','La loi fixe les règles concernant les droits civiques et les garanties fondamentales accordées aux citoyens pour l''exercice des libertés publiques.','epique',580,NULL),
('CONST-49','Constitution de 1958','Article 49','Responsabilité du Gouvernement','Le Premier ministre peut engager la responsabilité du Gouvernement devant l''Assemblée nationale sur le vote d''un projet de loi.','legendaire',1200,NULL),
('CONST-55','Constitution de 1958','Article 55','Primauté des traités','Les traités ou accords régulièrement ratifiés ou approuvés ont, dès leur publication, une autorité supérieure à celle des lois.','rare',330,NULL),
('DDHC-1','Déclaration de 1789','Article 1er','Liberté et égalité','Les hommes naissent et demeurent libres et égaux en droits. Les distinctions sociales ne peuvent être fondées que sur l''utilité commune.','legendaire',1300,NULL),
('DDHC-4','Déclaration de 1789','Article 4','Définition de la liberté','La liberté consiste à pouvoir faire tout ce qui ne nuit pas à autrui.','epique',640,NULL),
('DDHC-9','Déclaration de 1789','Article 9','Présomption d''innocence','Tout homme étant présumé innocent jusqu''à ce qu''il ait été déclaré coupable.','epique',660,NULL),
('CP-111-3','Code pénal','Article 111-3','Légalité des délits et des peines','Nul ne peut être puni pour un crime ou pour un délit dont les éléments ne sont pas définis par la loi.','rare',360,NULL),
('CP-121-1','Code pénal','Article 121-1','Responsabilité personnelle','Nul n''est responsable pénalement que de son propre fait.','peu_commune',160,NULL),
('CP-122-5','Code pénal','Article 122-5','Légitime défense','N''est pas pénalement responsable la personne qui, devant une atteinte injustifiée envers elle-même ou autrui, accomplit, dans le même temps, un acte commandé par la nécessité de la légitime défense.','epique',700,NULL),
('CP-311-1','Code pénal','Article 311-1','Le vol','Le vol est la soustraction frauduleuse de la chose d''autrui.','commune',80,NULL),
('CP-313-1','Code pénal','Article 313-1','L''escroquerie','L''escroquerie est le fait, par l''usage d''un faux nom ou d''une fausse qualité, de tromper une personne et de la déterminer à remettre des fonds.','peu_commune',150,NULL),
('CT-L1121-1','Code du travail','Article L1121-1','Libertés dans l''entreprise','Nul ne peut apporter aux droits des personnes et aux libertés individuelles et collectives de restrictions qui ne seraient pas justifiées par la nature de la tâche à accomplir.','rare',300,NULL),
('CT-L3121-27','Code du travail','Article L3121-27','Durée légale du travail','La durée légale de travail effectif des salariés à temps complet est fixée à trente-cinq heures par semaine.','peu_commune',170,NULL),
('CR-L2212-2','Code des collectivités','Article L2212-2','Pouvoirs de police du maire','La police municipale a pour objet d''assurer le bon ordre, la sûreté, la sécurité et la salubrité publiques.','commune',70,NULL),
('CCONS-L217-4','Code de la consommation','Article L217-4','Conformité du bien','Le vendeur livre un bien conforme au contrat et répond des défauts de conformité existant lors de la délivrance.','commune',65,NULL),
('CR-ARR-BAIGNADE','Arrêté municipal','Arrêté type','Interdiction de baignade','Arrêté municipal portant interdiction temporaire de la baignade sur le littoral communal en raison d''une pollution bactériologique constatée.','commune',40,NULL),
('CR-ARR-BRUIT','Arrêté municipal','Arrêté type','Lutte contre le bruit','Arrêté municipal réglementant les travaux bruyants de bricolage et de jardinage aux horaires fixés par le maire.','commune',35,NULL);
