-- ============================================
-- Trigger: quando atendimento NOVO é criado, chama edge whatsapp-auto-respond
-- via pg_net (extension HTTP assíncrona do Supabase)
-- ============================================

-- Habilita extension se ainda não
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Guarda URL + service role no GUC do banco (setado via sql direto uma vez)
-- Setar manualmente se não tiver (via dashboard ou psql):
--   ALTER DATABASE postgres SET "app.settings.supabase_url" = '...';
--   ALTER DATABASE postgres SET "app.settings.service_role_key" = '...';

CREATE OR REPLACE FUNCTION tg_whatsapp_dispatch_auto() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
  v_last_msg RECORD;
BEGIN
  -- Só processa criação de atendimento com status 'aberto'
  IF NEW.status <> 'aberto' THEN
    RETURN NEW;
  END IF;

  -- Busca última msg inbound pra passar body
  SELECT body, id INTO v_last_msg
  FROM whatsapp_messages
  WHERE instance_id = NEW.instance_id
    AND telefone = NEW.telefone
    AND direction = 'in'
  ORDER BY criado_em DESC
  LIMIT 1;

  IF v_last_msg.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- URL do Supabase (hardcoded pro Hub)
  v_url := 'https://ptmttmqprbullvgulyhb.supabase.co/functions/v1/whatsapp-auto-respond';
  -- Token: pega do GUC se configurado, senão null (pg_net tenta sem auth)
  BEGIN
    v_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_key := NULL;
  END;

  -- Dispara HTTP async (não bloqueia inserção)
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_key, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bXR0bXFwcmJ1bGx2Z3VseWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTMyMzksImV4cCI6MjA4ODU4OTIzOX0.D_wwsIH1zNow7gTwOCVSBalWgt629ZPdKZWl4jL9SNk')
    ),
    body := jsonb_build_object(
      'atendimento_id', NEW.id,
      'instance_id', NEW.instance_id,
      'telefone', NEW.telefone,
      'body', v_last_msg.body,
      'setor', NEW.setor,
      'message_id', v_last_msg.id
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS tg_wa_dispatch_auto ON whatsapp_atendimentos;
CREATE TRIGGER tg_wa_dispatch_auto
  AFTER INSERT ON whatsapp_atendimentos
  FOR EACH ROW EXECUTE FUNCTION tg_whatsapp_dispatch_auto();
