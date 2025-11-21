-- Seed drivers and vehicles for CodeCruise
-- Run this if your database has no drivers

-- Insert 5 drivers
INSERT INTO "Driver" (id, name, rating, status) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'John Smith', 4.9, 'AVAILABLE'),
  ('d1000000-0000-0000-0000-000000000002', 'Maria Garcia', 4.8, 'AVAILABLE'),
  ('d1000000-0000-0000-0000-000000000003', 'David Chen', 4.7, 'AVAILABLE'),
  ('d1000000-0000-0000-0000-000000000004', 'Sarah Johnson', 4.9, 'AVAILABLE'),
  ('d1000000-0000-0000-0000-000000000005', 'Michael Brown', 4.6, 'AVAILABLE')
ON CONFLICT (id) DO NOTHING;

-- Insert vehicles for each driver
INSERT INTO "Vehicle" (id, make, model, plate, type, "driverId") VALUES
  ('v1000000-0000-0000-0000-000000000001', 'Toyota', 'Camry', 'ABC-123', 'SEDAN', 'd1000000-0000-0000-0000-000000000001'),
  ('v1000000-0000-0000-0000-000000000002', 'Honda', 'Accord', 'XYZ-456', 'SEDAN', 'd1000000-0000-0000-0000-000000000002'),
  ('v1000000-0000-0000-0000-000000000003', 'Ford', 'Fusion', 'DEF-789', 'SEDAN', 'd1000000-0000-0000-0000-000000000003'),
  ('v1000000-0000-0000-0000-000000000004', 'Chevrolet', 'Malibu', 'GHI-012', 'SEDAN', 'd1000000-0000-0000-0000-000000000004'),
  ('v1000000-0000-0000-0000-000000000005', 'Nissan', 'Altima', 'JKL-345', 'SEDAN', 'd1000000-0000-0000-0000-000000000005')
ON CONFLICT (id) DO NOTHING;

-- Verify insertion
SELECT d.id, d.name, d.rating, v.make, v.model, v.plate
FROM "Driver" d
LEFT JOIN "Vehicle" v ON v."driverId" = d.id
ORDER BY d.name;
