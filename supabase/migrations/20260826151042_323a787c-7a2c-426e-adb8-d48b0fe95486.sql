ALTER TABLE public.custom_categories
  ADD COLUMN IF NOT EXISTS realm_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now(),
  ALTER COLUMN created_by DROP NOT NULL;

GRANT SELECT ON public.custom_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_categories TO authenticated;
GRANT ALL ON public.custom_categories TO service_role;

DROP TRIGGER IF EXISTS update_custom_categories_updated_at ON public.custom_categories;
CREATE TRIGGER update_custom_categories_updated_at
BEFORE UPDATE ON public.custom_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.custom_categories (id, name, realm_name, prompt, display_order, is_active) VALUES
 (1,'Adventure','Explorer''s Frontier','What made the journey gripping? Describe 3 moments of risk, discovery or courage that stood out.',1,true),
 (2,'Fantasy','Realm of Wonders','How convincing was the world-building? Share 3 magical or imagined elements you enjoyed most.',2,true),
 (3,'Historical','Timekeeper''s Vault','What did you learn about the period? Mention 3 details that made the past feel real.',3,true),
 (4,'Horror','Shadowlands','What created the tension or fear? Discuss 3 techniques the author used to unsettle you.',4,true),
 (5,'Romance','Heartlands','How did the relationship develop? Reflect on 3 moments that shaped the connection between the characters.',5,true),
 (6,'Science','Discovery Lab','What scientific idea did the book explore? Explain 3 things you now understand better.',6,true),
 (7,'Short Stories','Story Islands','Which story stayed with you and why? Compare 3 stories in terms of theme, mood or style.',7,true),
 (8,'Play','Grand Stage','How did dialogue and stage directions shape the drama? Reflect on 3 scenes that carried the most weight.',8,true),
 (9,'African Fiction','Motherland Voices','How did the African setting and voice shape the story? Share 3 cultural or social insights you gained.',9,true),
 (10,'Swahili','Pwani ya Lugha','Eleza ulichojifunza kutokana na kitabu hiki. Taja mambo 3 yaliyokuvutia kuhusu lugha, wahusika au maudhui.',10,true),
 (11,'Poetry','Verse Garden','Reflect on the themes, emotions and imagery used by the poet. Did any poem resonate with you personally?',11,true),
 (12,'Mystery','Riddle Quarter','How well was the puzzle built? Discuss 3 clues, red herrings or twists that shaped your reading.',12,true),
 (13,'Realistic','Mirror City','How true to life did the story feel? Share 3 situations or characters that mirrored real experiences.',13,true),
 (14,'Biography','Hall of Lives','How did this life story inspire or challenge you? What 3 lessons or perspectives did you gain?',14,true),
 (15,'Graphic Novels','Graphic Galaxy','Did the artwork enhance the storytelling? Share 3 aspects of the visuals and narrative that you appreciated.',15,true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    realm_name = EXCLUDED.realm_name,
    prompt = EXCLUDED.prompt,
    display_order = EXCLUDED.display_order,
    is_active = true;

SELECT setval(pg_get_serial_sequence('public.custom_categories','id'), GREATEST((SELECT MAX(id) FROM public.custom_categories), 15));

ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_categories;

CREATE OR REPLACE VIEW public.leaderboard_view AS
WITH capped AS (
  SELECT user_id, LEAST(COUNT(*), 4) AS counted
  FROM public.book_submissions
  GROUP BY user_id, category_number
), totals AS (
  SELECT user_id, LEAST(SUM(counted), 45)::integer AS books
  FROM capped
  GROUP BY user_id
)
SELECT p.user_id,
       p.full_name,
       p.house::text AS house,
       p.year_group::text AS year_group,
       p.class_name,
       p.avatar_url,
       COALESCE(t.books, 0) AS books,
       (CASE WHEN COALESCE(t.books, 0) > 0 THEN 3 ELSE 0 END
        + COALESCE(t.books, 0) * 3
        + CASE WHEN COALESCE(t.books, 0) >= 15 THEN 5 ELSE 0 END
        + CASE WHEN COALESCE(t.books, 0) >= 30 THEN 10 ELSE 0 END
        + CASE WHEN COALESCE(t.books, 0) >= 45 THEN 15 ELSE 0 END)::integer AS points
FROM public.profiles p
LEFT JOIN totals t ON t.user_id = p.user_id
WHERE p.role = 'student'::public.user_role;