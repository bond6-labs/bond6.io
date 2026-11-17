-- Optional publisher-supplied previews. Bond6 keeps links only: it does not
-- download, re-host, or manufacture media.
ALTER TABLE stories ADD COLUMN image_url TEXT;
ALTER TABLE stories ADD COLUMN audio_url TEXT;
ALTER TABLE stories ADD COLUMN video_url TEXT;
