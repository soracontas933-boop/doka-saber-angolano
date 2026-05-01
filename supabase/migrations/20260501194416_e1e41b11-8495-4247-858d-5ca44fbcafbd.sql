UPDATE storage.buckets
SET file_size_limit = 209715200,
    allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'book-files';

UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp']
WHERE id = 'book-covers';