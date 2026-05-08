-- Digital Twin semantic layers for 2D/3D contextual rendering
-- Stores AI-derived scene understanding on each captured twin point.

ALTER TABLE public.digital_twin_points
  ADD COLUMN IF NOT EXISTS semantic_classes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS object_detections jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS spatial_inference jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_digital_twin_points_semantic_classes_gin
  ON public.digital_twin_points
  USING gin (semantic_classes);

CREATE INDEX IF NOT EXISTS idx_digital_twin_points_object_detections_gin
  ON public.digital_twin_points
  USING gin (object_detections);
