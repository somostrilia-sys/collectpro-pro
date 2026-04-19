// whatsapp-business-action — Business Profile + Catálogo UAZAPI
//
// Body: { instance_id: string, action: string, ...params }
// Actions:
//   - profile_get: {}                          // POST /business/get/profile
//   - profile_categories: {}                   // GET /business/get/categories
//   - profile_update: { profile }              // POST /business/update/profile
//   - catalog_list: { limit?, offset? }        // POST /business/catalog/list
//   - catalog_info: { productId }              // POST /business/catalog/info
//   - catalog_delete: { productId }
//   - catalog_show: { productId }
//   - catalog_hide: { productId }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, bad } from "../_shared/whatsapp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const { instance_id, action } = body;
    if (!instance_id || !action) return bad("instance_id e action obrigatórios");

    const { data: instance } = await supabase.from("whatsapp_instances")
      .select("*").eq("id", instance_id).maybeSingle();
    if (!instance?.token) return bad("instância sem token", 400);

    const serverUrl = instance.servidor_url || "https://trilhoassist.uazapi.com";
    const token = instance.token;

    const call = async (endpoint: string, payload: any = {}, method: string = "POST") => {
      const res = await fetch(`${serverUrl}${endpoint}`, {
        method,
        headers: method === "GET"
          ? { token }
          : { "Content-Type": "application/json", token },
        body: method === "POST" ? JSON.stringify(payload) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    };

    const { action: _a, instance_id: _i, ...payload } = body;

    const routes: Record<string, { endpoint: string; method?: string }> = {
      profile_get: { endpoint: "/business/get/profile" },
      profile_categories: { endpoint: "/business/get/categories", method: "GET" },
      profile_update: { endpoint: "/business/update/profile" },
      catalog_list: { endpoint: "/business/catalog/list" },
      catalog_info: { endpoint: "/business/catalog/info" },
      catalog_delete: { endpoint: "/business/catalog/delete" },
      catalog_show: { endpoint: "/business/catalog/show" },
      catalog_hide: { endpoint: "/business/catalog/hide" },
    };

    const route = routes[action];
    if (!route) return bad(`ação desconhecida: ${action}`);

    const r = await call(route.endpoint, payload, route.method);
    return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});
