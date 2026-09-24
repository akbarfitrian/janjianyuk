-- Normalisasi no. HP pelanggan ke format 628xxxxxxxxxx, gabungkan pelanggan
-- kembar (no. sama dalam satu outlet), lalu pasang unique (outletId, phone).
--
-- Aturan normalisasi HARUS sama dengan lib/phone.ts#normalizePhone:
--   buang non-digit → buang awalan "00" → "0xxx" jadi "62xxx", "8xxx" jadi
--   "628xxx" → "620…" jadi "62…" → valid kalau cocok ^628[0-9]{7,11}$.
--
-- 1) Normalisasi. Baris yang nggak bisa dinormalisasi jadi valid (nomor
--    pendek/aneh, luar negeri) DIBIARKAN apa adanya — nggak ada data yang
--    dibuang; admin bisa benerin lewat menu Pelanggan.
UPDATE "Customer" c
SET "phone" = n.norm
FROM (
  SELECT id,
         regexp_replace(
           CASE
             WHEN d0 ~ '^0' THEN '62' || substr(d0, 2)
             WHEN d0 ~ '^8' THEN '62' || d0
             ELSE d0
           END,
           '^620', '62'
         ) AS norm
  FROM (
    SELECT id,
           regexp_replace(regexp_replace("phone", '[^0-9]', '', 'g'), '^00', '') AS d0
    FROM "Customer"
  ) x
) n
WHERE c.id = n.id
  AND n.norm ~ '^628[0-9]{7,11}$'
  AND c."phone" <> n.norm;

-- 2) Gabungkan pelanggan kembar (hanya yang no. HP-nya valid — nomor asal
--    seperti "-" atau "123" nggak boleh dianggap orang yang sama). Yang
--    dipertahankan: pelanggan paling lama. Booking & paket dipindah ke dia,
--    catatan yang beda digabung dipisah " | ".
CREATE TEMP TABLE customer_merge_tmp AS
SELECT id,
       FIRST_VALUE(id) OVER w AS keep_id
FROM "Customer"
WHERE "phone" ~ '^628[0-9]{7,11}$'
WINDOW w AS (PARTITION BY "outletId", "phone" ORDER BY "createdAt", id);

DELETE FROM customer_merge_tmp
WHERE keep_id IN (
  SELECT keep_id FROM customer_merge_tmp GROUP BY keep_id HAVING count(*) = 1
);

UPDATE "Customer" c
SET "notes" = agg.merged
FROM (
  SELECT g.keep_id, string_agg(g.notes, ' | ' ORDER BY g.first_at, g.notes) AS merged
  FROM (
    SELECT m.keep_id, cu."notes", MIN(cu."createdAt") AS first_at
    FROM customer_merge_tmp m
    JOIN "Customer" cu ON cu.id = m.id
    WHERE cu."notes" IS NOT NULL AND btrim(cu."notes") <> ''
    GROUP BY m.keep_id, cu."notes"
  ) g
  GROUP BY g.keep_id
) agg
WHERE c.id = agg.keep_id;

UPDATE "Booking" b
SET "customerId" = m.keep_id
FROM customer_merge_tmp m
WHERE b."customerId" = m.id AND m.id <> m.keep_id;

UPDATE "CustomerPackage" cp
SET "customerId" = m.keep_id
FROM customer_merge_tmp m
WHERE cp."customerId" = m.id AND m.id <> m.keep_id;

DELETE FROM "Customer" c
USING customer_merge_tmp m
WHERE c.id = m.id AND m.id <> m.keep_id;

DROP TABLE customer_merge_tmp;

-- 3) Sisa no. HP nggak valid yang kembar di satu outlet dikasih akhiran
--    "#2", "#3", … (bukan digabung) supaya unique index bisa dipasang tanpa
--    menghapus siapa pun.
UPDATE "Customer" c
SET "phone" = c."phone" || '#' || r.rn
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "outletId", "phone" ORDER BY "createdAt", id) AS rn
  FROM "Customer"
  WHERE "phone" !~ '^628[0-9]{7,11}$'
) r
WHERE c.id = r.id AND r.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_outletId_phone_key" ON "Customer"("outletId", "phone");
