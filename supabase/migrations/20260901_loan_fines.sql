-- ==========================================================================
-- Migración: registro manual de multas por préstamo (loan_fines)
-- Fecha: 2026-09-01
-- Aplica en: Supabase Dashboard -> SQL Editor -> pegar y ejecutar.
--
-- QUÉ HACE
--   1. Crea la tabla `loan_fines` para el registro MANUAL de multas.
--   2. Agrega a `payments` las columnas `fine_id` e `is_fine_only`
--      para vincular el cobro de una multa con su transacción.
--
-- REGLA DE GANANCIAS (una sola fuente de verdad, sin duplicar)
--   - Una multa con status 'registered' (pendiente) NO es ganancia.
--   - Una multa con status 'collected' SÍ es ganancia, y su cobro
--     siempre pasa por una transacción de pago cuyo `lateFeePortion`
--     es el monto de la multa. La multa guarda el `payment_id` de
--     esa transacción (ver `calculateFineProfit` en src/utils/finance.ts).
--   - La ganancia normal (`profitPortion`) nunca incluye la multa:
--     el desglose del pago resta primero la porción de multa.
--   - Ganancia total = ganancia normal + ganancia por multas cobradas.
--   - La mora automática histórica (pagos con `late_fee_portion` sin
--     multa manual vinculada) se cuenta como ganancia por multas solo
--     en la parte que excede las multas vinculadas a ese pago.
--
-- COMPATIBILIDAD
--   - La app funciona aunque esta migración aún no se haya aplicado:
--     si la tabla no existe, las multas se guardan en localStorage y
--     se sincronizan en cuanto se aplica la migración. No se tocan
--     credenciales ni variables de entorno.
--   - Las columnas nuevas de `payments` son opcionales (NULL / false)
--     para no romper los pagos ya registrados.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Tabla de multas manuales por préstamo
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loan_fines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  loan_id uuid NOT NULL REFERENCES public.loans (id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  reason text NOT NULL DEFAULT '',
  note text,
  -- 'registered' = pendiente (NO es ganancia todavía)
  -- 'collected'  = cobrada (SÍ es ganancia realizada)
  -- 'cancelled'  = cancelada (nunca fue ni será ganancia)
  status text NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'collected', 'cancelled')),
  fine_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  collected_at timestamptz,
  payment_id uuid REFERENCES public.payments (id) ON DELETE SET NULL,
  payment_method text,
  cancelled_at timestamptz
);

CREATE INDEX IF NOT EXISTS loan_fines_loan_id_idx
  ON public.loan_fines (loan_id);
CREATE INDEX IF NOT EXISTS loan_fines_client_id_idx
  ON public.loan_fines (client_id);
CREATE INDEX IF NOT EXISTS loan_fines_status_idx
  ON public.loan_fines (status);
CREATE INDEX IF NOT EXISTS loan_fines_user_id_idx
  ON public.loan_fines (user_id);

COMMENT ON TABLE public.loan_fines IS
  'Multas manuales registradas por préstamo. Solo las cobradas (status = collected) cuentan como ganancia por multas; las registradas pendientes no.';

-- --------------------------------------------------------------------------
-- 2. Vínculo pago <-> multa en la tabla de pagos
-- --------------------------------------------------------------------------
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS fine_id uuid REFERENCES public.loan_fines (id) ON DELETE SET NULL;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS is_fine_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.payments.fine_id IS
  'Multa manual que este pago salda (si aplica). La ganancia por multas se calcula por la multa, no sumando este pago otra vez.';
COMMENT ON COLUMN public.payments.is_fine_only IS
  'true cuando el pago es únicamente el cobro de una multa: no abona al préstamo (capital 0, ganancia normal 0).';

CREATE INDEX IF NOT EXISTS payments_fine_id_idx
  ON public.payments (fine_id);

-- --------------------------------------------------------------------------
-- 3. Seguridad (RLS): cada usuario solo ve y gestiona sus multas
--    (mismo patrón que las demás tablas de la app)
-- --------------------------------------------------------------------------
ALTER TABLE public.loan_fines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'loan_fines'
      AND policyname = 'Users can manage own loan fines'
  ) THEN
    CREATE POLICY "Users can manage own loan fines"
      ON public.loan_fines
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
