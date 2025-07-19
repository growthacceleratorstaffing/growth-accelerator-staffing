-- Delete the 6 local jobs as requested by the user
DELETE FROM jobs WHERE id IN (
  '128fc821-a2e8-4bfc-9238-cf22e90c614b', -- Tester job (General)
  '6c99ad49-1867-48d8-b597-6eb0ba554ed7', -- Tester job (General) 
  '3f225091-a031-4e89-8d25-e65b82474b8f', -- Senior Cloud Engineer (Growth Accelerator)
  'b51f6995-b7b4-4dff-9f20-13bd4c5c2fbc', -- Test job (General)
  '15bf382f-f2ae-414e-99f0-5f678d67bf12', -- Platform Engineer (Growth Accelerator)
  '6b0dbe66-3e26-4eb3-9aa9-02ac7f726eb7'  -- MLOps Engineer
);