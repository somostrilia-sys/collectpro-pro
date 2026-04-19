// whatsapp-group-action — gestão completa de grupos e comunidades UAZAPI
//
// Body: { instance_id: string, action: string, ...params }
// Actions (groups):
//   - create: { name, participants: string[] }
//   - info: { group_jid }
//   - invite_info: { invite_code }
//   - join: { invite_code }
//   - leave: { group_jid }
//   - list: { }
//   - list_paginated: { limit?, offset?, query? }
//   - reset_invite: { group_jid }
//   - update_announce: { group_jid, announce_only: boolean }
//   - update_locked: { group_jid, locked: boolean }
//   - update_description: { group_jid, description }
//   - update_image: { group_jid, image_url }
//   - update_name: { group_jid, name }
//   - update_participants: { group_jid, participants: string[], action: "add"|"remove"|"promote"|"demote" }
// Actions (communities):
//   - community_create: { name, description? }
//   - community_edit_groups: { community_jid, groups: string[], action: "add"|"remove" }

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
    if (!instance_id) return bad("instance_id obrigatório");
    if (!action) return bad("action obrigatória");

    const { data: instance } = await supabase.from("whatsapp_instances")
      .select("*").eq("id", instance_id).maybeSingle();
    if (!instance?.token) return bad("instância sem token", 400);

    const serverUrl = instance.servidor_url || "https://trilhoassist.uazapi.com";
    const token = instance.token;

    const callPost = async (endpoint: string, payload: any = {}) => {
      const res = await fetch(`${serverUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    };

    const callGet = async (endpoint: string) => {
      const res = await fetch(`${serverUrl}${endpoint}`, {
        method: "GET",
        headers: { token },
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    };

    // Helper pra atualizar cache após mudança
    const refreshGroupCache = async (groupJid: string) => {
      const r = await callPost("/group/info", { groupJid });
      if (!r.ok) return;
      const group = r.data?.group ?? r.data;
      const participants = Array.isArray(group?.Participants) ? group.Participants : [];
      await supabase.from("whatsapp_groups").upsert({
        instance_id,
        group_jid: groupJid,
        nome: group?.Name ?? null,
        descricao: group?.Topic ?? null,
        owner_jid: group?.OwnerJID ?? null,
        avatar_url: group?.image ?? group?.picture ?? null,
        is_announce: group?.IsAnnounce ?? false,
        is_locked: group?.IsLocked ?? false,
        participants,
        participants_count: participants.length,
        invite_link: group?.invite_link ?? null,
        last_refresh: new Date().toISOString(),
        raw: group,
      }, { onConflict: "instance_id,group_jid" });
    };

    switch (action) {
      // ═══ GRUPOS ═══
      case "create": {
        const { name, participants } = body;
        if (!name || !Array.isArray(participants)) return bad("name e participants obrigatórios");
        const r = await callPost("/group/create", { name, participants });
        if (r.ok && r.data?.JID) {
          await refreshGroupCache(r.data.JID);
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "info": {
        const { group_jid } = body;
        if (!group_jid) return bad("group_jid obrigatório");
        const r = await callPost("/group/info", { groupJid: group_jid });
        if (r.ok) await refreshGroupCache(group_jid);
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "invite_info": {
        const { invite_code } = body;
        if (!invite_code) return bad("invite_code obrigatório");
        const r = await callPost("/group/inviteInfo", { invitecode: invite_code });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "join": {
        const { invite_code } = body;
        if (!invite_code) return bad("invite_code obrigatório");
        const r = await callPost("/group/join", { invitecode: invite_code });
        if (r.ok && r.data?.JID) await refreshGroupCache(r.data.JID);
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "leave": {
        const { group_jid } = body;
        if (!group_jid) return bad("group_jid obrigatório");
        const r = await callPost("/group/leave", { groupJid: group_jid });
        if (r.ok) {
          await supabase.from("whatsapp_groups")
            .delete()
            .eq("instance_id", instance_id)
            .eq("group_jid", group_jid);
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "list": {
        const r = await callGet("/group/list");
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "list_paginated": {
        const { limit, offset, query } = body;
        const r = await callPost("/group/list", {
          limit: limit ?? 100,
          offset: offset ?? 0,
          search: query ?? "",
        });
        // Sincroniza cache
        if (r.ok && Array.isArray(r.data?.groups ?? r.data?.data ?? r.data)) {
          const list = r.data?.groups ?? r.data?.data ?? r.data;
          for (const g of list) {
            const jid = g.JID ?? g.id ?? g.groupJid;
            if (!jid) continue;
            const participants = Array.isArray(g.Participants) ? g.Participants : [];
            await supabase.from("whatsapp_groups").upsert({
              instance_id,
              group_jid: jid,
              nome: g.Name ?? null,
              descricao: g.Topic ?? null,
              owner_jid: g.OwnerJID ?? null,
              avatar_url: g.image ?? null,
              is_announce: g.IsAnnounce ?? false,
              is_locked: g.IsLocked ?? false,
              is_parent: g.IsParent ?? false,
              linked_parent_jid: g.LinkedParentJID ?? null,
              participants,
              participants_count: participants.length,
              last_refresh: new Date().toISOString(),
              raw: g,
            }, { onConflict: "instance_id,group_jid" });
          }
        }
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "reset_invite": {
        const { group_jid } = body;
        if (!group_jid) return bad("group_jid obrigatório");
        const r = await callPost("/group/resetInviteCode", { groupJid: group_jid });
        if (r.ok) await refreshGroupCache(group_jid);
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "update_announce": {
        const { group_jid, announce_only } = body;
        if (!group_jid) return bad("group_jid obrigatório");
        const r = await callPost("/group/updateAnnounce", {
          groupJid: group_jid,
          announce: announce_only !== false,
        });
        if (r.ok) await refreshGroupCache(group_jid);
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "update_locked": {
        const { group_jid, locked } = body;
        if (!group_jid) return bad("group_jid obrigatório");
        const r = await callPost("/group/updateLocked", {
          groupJid: group_jid,
          locked: locked !== false,
        });
        if (r.ok) await refreshGroupCache(group_jid);
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "update_description": {
        const { group_jid, description } = body;
        if (!group_jid) return bad("group_jid obrigatório");
        const r = await callPost("/group/updateDescription", {
          groupJid: group_jid,
          description: description ?? "",
        });
        if (r.ok) await refreshGroupCache(group_jid);
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "update_image": {
        const { group_jid, image_url } = body;
        if (!group_jid || !image_url) return bad("group_jid e image_url obrigatórios");
        const r = await callPost("/group/updateImage", {
          groupJid: group_jid,
          image: image_url,
        });
        if (r.ok) await refreshGroupCache(group_jid);
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "update_name": {
        const { group_jid, name } = body;
        if (!group_jid || !name) return bad("group_jid e name obrigatórios");
        const r = await callPost("/group/updateName", { groupJid: group_jid, name });
        if (r.ok) await refreshGroupCache(group_jid);
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "update_participants": {
        const { group_jid, participants, action: participantAction } = body;
        if (!group_jid || !Array.isArray(participants) || !participantAction) {
          return bad("group_jid, participants e action obrigatórios");
        }
        const r = await callPost("/group/updateParticipants", {
          groupJid: group_jid,
          participants,
          action: participantAction, // add, remove, promote, demote
        });
        if (r.ok) await refreshGroupCache(group_jid);
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      // ═══ COMUNIDADES ═══
      case "community_create": {
        const { name } = body;
        if (!name) return bad("name obrigatório");
        const r = await callPost("/community/create", { name });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      case "community_edit_groups": {
        const { community_jid, groups, action: commAction } = body;
        if (!community_jid || !Array.isArray(groups) || !commAction) {
          return bad("community_jid, groups e action obrigatórios");
        }
        const r = await callPost("/community/editgroups", {
          community: community_jid,
          groupjids: groups,
          action: commAction, // add, remove
        });
        return json({ success: r.ok, data: r.data }, r.ok ? 200 : 502);
      }

      default:
        return bad(`ação desconhecida: ${action}`);
    }
  } catch (e: any) {
    return bad(e.message || "Erro interno", 500);
  }
});
