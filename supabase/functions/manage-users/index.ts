import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller is authenticated
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin or gestora
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    const { action, ...payload } = await req.json();

    // Actions that require admin/gestora role
    const adminActions = ["list_users", "create_user", "update_profile", "block_user"];
    if (adminActions.includes(action) && !["admin", "gestora"].includes(callerProfile?.role || "")) {
      return new Response(JSON.stringify({ error: "Permissão negada" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── get_profile: any authenticated user can read their own profile ──
    if (action === "get_profile") {
      const userId = payload.user_id || caller.id;
      // Users can only read their own profile unless admin/gestora
      if (userId !== caller.id && !["admin", "gestora"].includes(callerProfile?.role || "")) {
        return new Response(JSON.stringify({ error: "Permissão negada" }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const { data: profile, error } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, role, permissions")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, profile }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── list_users: list all profiles + auth emails ──
    if (action === "list_users") {
      const { data: profiles, error } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, avatar_url, role, permissions, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
      const emailMap: Record<string, { email: string; lastSignIn: string | null }> = {};
      (authData?.users || []).forEach((u: any) => {
        emailMap[u.id] = { email: u.email || "", lastSignIn: u.last_sign_in_at };
      });

      return new Response(JSON.stringify({ success: true, profiles, emailMap }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── create_user: create auth user + profile ──
    if (action === "create_user") {
      const { email, password, full_name, role, permissions } = payload;
      if (!email || !password || !full_name) {
        return new Response(JSON.stringify({ error: "email, password e full_name são obrigatórios" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ full_name, role: role || "colaborador", permissions: permissions || null })
        .eq("id", authData.user.id);
      if (profileError) throw profileError;

      return new Response(JSON.stringify({ success: true, user_id: authData.user.id }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── update_profile: update role/permissions/name ──
    if (action === "update_profile") {
      const { user_id, full_name, role, permissions } = payload;
      if (!user_id) throw new Error("user_id é obrigatório");

      const updateData: Record<string, any> = {};
      if (full_name !== undefined) updateData.full_name = full_name;
      if (role !== undefined) updateData.role = role;
      if (permissions !== undefined) updateData.permissions = permissions;

      const { error } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── block_user: toggle blocked status ──
    if (action === "block_user") {
      const { user_id, block } = payload;
      if (!user_id) throw new Error("user_id é obrigatório");

      if (block) {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ role: "bloqueado" })
          .eq("id", user_id);
        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ role: "colaborador" })
          .eq("id", user_id);
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação desconhecida" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
