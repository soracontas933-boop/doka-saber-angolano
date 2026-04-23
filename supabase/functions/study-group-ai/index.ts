// Edge function para o módulo "Grupos Inteligentes de Estudo".
// Acções suportadas:
//  - "dividir":   divide o trabalho em N partes (uma por membro) e cria study_group_parts
//  - "regenerar": regenera o conteúdo de uma parte específica (cobra 10 créditos)
//  - "defesa":    gera defesa (resumo/pontos/perguntas) para a parte do membro
//  - "bot":       responde a um comando "@Delle ..." enviado no chat
//
// A IA usa exactamente o mesmo orquestrador da função ai-proxy via fetch interno.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function callAI(messages: any[], maxTokens = 3000): Promise<string> {
  // Reaproveita o orquestrador existente
  const r = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`ai-proxy ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? j.content ?? "";
}

function tryParseJSON(s: string): any {
  // tenta extrair primeiro bloco JSON válido
  const cleaned = s.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (m) {
      try { return JSON.parse(m[0]); } catch {}
    }
    return null;
  }
}

async function authUser(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  const supa = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data } = await supa.auth.getUser(token);
  return { user: data.user, supa };
}

async function consumeCredits(supa: any, userId: string, amount: number): Promise<boolean> {
  const { data, error } = await supa.rpc("consume_credits", { p_user_id: userId, p_amount: amount });
  if (error) return false;
  return data === true;
}

async function postBotMessage(supa: any, groupId: string, conteudo: string) {
  await supa.from("study_group_messages").insert({
    group_id: groupId,
    sender_id: null,
    sender_nome: "Delle",
    sender_cor: "#1E9DF1",
    conteudo,
    is_bot: true,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user, supa } = await authUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "nao_autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action: string = body.action;
    const groupId: string = body.group_id;

    if (!action || !groupId) {
      return new Response(JSON.stringify({ error: "parametros_em_falta" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica que o utilizador é membro aceite ou dono
    const { data: groupRow } = await supa.from("study_groups").select("*").eq("id", groupId).single();
    if (!groupRow) {
      return new Response(JSON.stringify({ error: "grupo_nao_encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: meMember } = await supa
      .from("study_group_members")
      .select("*")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .eq("aceite", true)
      .maybeSingle();
    if (!meMember && groupRow.criado_por !== user.id) {
      return new Response(JSON.stringify({ error: "sem_acesso" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── DIVIDIR ────────────────────────────────────────────────
    if (action === "dividir") {
      if (groupRow.criado_por !== user.id) {
        return new Response(JSON.stringify({ error: "apenas_dono_pode_dividir" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: members } = await supa
        .from("study_group_members")
        .select("*")
        .eq("group_id", groupId)
        .eq("aceite", true)
        .order("entrou_em");

      if (!members || members.length === 0) {
        return new Response(JSON.stringify({ error: "sem_membros" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const memberList = members.map((m: any, i: number) => `${i + 1}. ${m.nome_exibicao}`).join("\n");

      const prompt = `És uma assistente acadêmica angolana. Divide um trabalho escolar/académico entre ${members.length} membros.

Tema: ${groupRow.tema}
Disciplina: ${groupRow.disciplina}

Membros:
${memberList}

Cria EXACTAMENTE ${members.length} secções (uma por membro), cada uma com um título claro e o conteúdo escrito completo (3-6 parágrafos por secção, em português de Angola, alinhado ao currículo INIDE/MED quando aplicável).

Devolve APENAS JSON válido neste formato (sem texto adicional):
{
  "partes": [
    { "membro_index": 1, "titulo": "...", "conteudo": "..." },
    { "membro_index": 2, "titulo": "...", "conteudo": "..." }
  ]
}`;

      const txt = await callAI(
        [
          { role: "system", content: "Devolves SEMPRE apenas JSON válido conforme o esquema pedido." },
          { role: "user", content: prompt },
        ],
        4500
      );
      const parsed = tryParseJSON(txt);
      if (!parsed?.partes || !Array.isArray(parsed.partes)) {
        return new Response(JSON.stringify({ error: "ia_resposta_invalida" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Apaga partes antigas e insere novas
      await supa.from("study_group_parts").delete().eq("group_id", groupId);

      const rows = parsed.partes.slice(0, members.length).map((p: any, i: number) => {
        const member = members[Math.min((p.membro_index ?? i + 1) - 1, members.length - 1)];
        return {
          group_id: groupId,
          member_id: member.id,
          user_id: member.user_id,
          titulo: String(p.titulo || `Parte ${i + 1}`).slice(0, 200),
          conteudo: String(p.conteudo || ""),
          ordem: i,
        };
      });

      const { error: insErr } = await supa.from("study_group_parts").insert(rows);
      if (insErr) throw insErr;

      await supa.from("study_groups").update({ estado: "dividido", atualizado_em: new Date().toISOString() }).eq("id", groupId);
      await postBotMessage(supa, groupId, `✅ Trabalho dividido em ${rows.length} partes. Cada membro pode ver a sua parte na aba "Minha Parte".`);

      return new Response(JSON.stringify({ ok: true, partes: rows.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── REGENERAR (10 créditos) ────────────────────────────────
    if (action === "regenerar") {
      const partId: string = body.part_id;
      if (!partId) {
        return new Response(JSON.stringify({ error: "part_id_em_falta" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: part } = await supa.from("study_group_parts").select("*").eq("id", partId).single();
      if (!part || part.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "sem_acesso_parte" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ok = await consumeCredits(supa, user.id, 10);
      if (!ok) {
        return new Response(JSON.stringify({ error: "creditos_insuficientes" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const txt = await callAI(
        [
          { role: "system", content: "És assistente acadêmica angolana. Escreves em PT-Angola, claro e estruturado." },
          { role: "user", content: `Reescreve completamente esta secção, mantendo o título e melhorando profundidade, clareza e exemplos. Tema do trabalho: "${groupRow.tema}". Disciplina: ${groupRow.disciplina}.

Título: ${part.titulo}
Versão atual:
${part.conteudo}

Devolve APENAS o conteúdo reescrito (sem título, sem JSON, sem comentários).` },
        ],
        3500
      );

      await supa
        .from("study_group_parts")
        .update({ conteudo: txt.trim(), atualizado_em: new Date().toISOString() })
        .eq("id", partId);

      return new Response(JSON.stringify({ ok: true, conteudo: txt.trim() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── DEFESA ─────────────────────────────────────────────────
    if (action === "defesa") {
      const partId: string = body.part_id;
      const { data: part } = await supa.from("study_group_parts").select("*").eq("id", partId).single();
      if (!part || (part.user_id !== user.id && groupRow.criado_por !== user.id)) {
        return new Response(JSON.stringify({ error: "sem_acesso_parte" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const txt = await callAI(
        [
          { role: "system", content: "Devolves SEMPRE apenas JSON válido conforme o esquema pedido." },
          { role: "user", content: `A partir desta parte do trabalho, gera material de defesa oral.

Título: ${part.titulo}
Conteúdo:
${part.conteudo}

Devolve APENAS JSON neste formato:
{
  "resumo": "resumo de apresentação em 4-6 frases, PT-Angola",
  "pontos_chave": ["ponto 1", "ponto 2", "ponto 3", "ponto 4", "ponto 5"],
  "perguntas": [
    { "q": "pergunta 1?", "a": "resposta sugerida 1" },
    { "q": "pergunta 2?", "a": "resposta sugerida 2" },
    { "q": "pergunta 3?", "a": "resposta sugerida 3" },
    { "q": "pergunta 4?", "a": "resposta sugerida 4" },
    { "q": "pergunta 5?", "a": "resposta sugerida 5" }
  ]
}` },
        ],
        2500
      );
      const parsed = tryParseJSON(txt);
      if (!parsed) {
        return new Response(JSON.stringify({ error: "ia_resposta_invalida" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supa.from("study_group_parts").update({ defesa: parsed }).eq("id", partId);
      return new Response(JSON.stringify({ ok: true, defesa: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── BOT (@Delle no chat) ───────────────────────────────────
    if (action === "bot") {
      const comando: string = (body.comando || "").toLowerCase();
      if (comando.includes("dividir")) {
        // dispara dividir directamente
        const fakeReq = new Request(req.url, {
          method: "POST",
          headers: req.headers,
          body: JSON.stringify({ action: "dividir", group_id: groupId }),
        });
        return await (serve as any).handler?.(fakeReq) ??
          new Response(JSON.stringify({ ok: true, hint: "Use action=dividir directamente" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
      }

      // Resposta livre da Delle no chat
      const txt = await callAI(
        [
          { role: "system", content: "És a Delle, assistente acadêmica angolana, simpática e directa. Responde em PT-Angola, em 1-3 parágrafos curtos." },
          { role: "user", content: `Contexto do grupo:\nTema: ${groupRow.tema}\nDisciplina: ${groupRow.disciplina}\n\nMensagem: ${body.comando}` },
        ],
        800
      );
      await postBotMessage(supa, groupId, txt.trim());
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "accao_desconhecida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[study-group-ai] erro:", e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || "erro_interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
