// _shared/providers/uazapi.ts
// Re-exporta helpers UAZAPI que vivem em _shared/whatsapp.ts.
// Mantém isolamento simbólico: código Meta pode checar que não importa de "uazapi.ts".
//
// Os helpers originais permanecem em _shared/whatsapp.ts pra não quebrar
// as 17 edges UAZAPI existentes que importam de lá.

export {
  UAZAPI_SERVER,
  uazapiAdminToken,
  uazapiSend,
  uazapiAdminCreateInstance,
  uazapiConnect,
  uazapiStatus,
  uazapiDisconnect,
  uazapiSetWebhook,
  uazapiGroupInfo,
  uazapiChatDetails,
  uazapiMessageDownload,
  mapUazapiStatus,
  isGroupJid,
  isNewsletterJid,
  jidToPhone,
  resolveConversationPhone,
} from "../whatsapp.ts";

export type { UazapiSendPayload } from "../whatsapp.ts";
