import { useState, useRef, useEffect, useCallback } from "react";

// ── Groq API helper ──────────────────────────────
async function askClaude(messages, system = "") {
  const groqMessages = [];
  if (system) groqMessages.push({ role: "system", content: system });
  groqMessages.push(...messages);

  const res = await fetch("/api/groq", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: groqMessages }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── Design tokens ──────────────────────────────────────────────
const C = {
  bg: "#0f0e17",
  surface: "#1a1828",
  surfaceHigh: "#242236",
  border: "#2e2c45",
  accent: "#a78bfa",
  accentWarm: "#fb923c",
  accentGreen: "#34d399",
  text: "#e8e6f0",
  muted: "#7c7a9a",
  danger: "#f87171",
};

const FONT = "'Zen Kaku Gothic New', sans-serif";

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: ${C.bg}; color: ${C.text}; font-family: ${FONT}; }
.fadeUp { animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
@keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
`;

// ─────────────────────────────────────────────────────────────
// 1. AIチャット相談
// ─────────────────────────────────────────────────────────────
const CHAT_SYSTEM = `あなたは日本の大学生を支える親身なAIカウンセラーです。
【ルール】
・不自然な敬語（例：提供させていただかせてください）は絶対に使わない。
・「〜だね」「〜ですよ」といった、温かい先輩のような口調で話す。
・まず相手の気持ちを肯定（「それは大変だよね」「よく頑張ってるね」）してからアドバイスする。
・機械的な箇条書きは避け、自然な文章で回答する。`;

function ChatTab() {
  const [messages, setMessages] = useState([{ role: "assistant", content: "相談に乗るよ。最近、人間関係や勉強で困ってることはない？" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const reply = await askClaude(next.slice(1), CHAT_SYSTEM);
      setMessages([...next, { role: "assistant", content: reply }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "500px", gap: 12 }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", background: m.role === "user" ? C.accent : C.surfaceHigh, padding: "10px 14px", borderRadius: 12, maxWidth: "80%", fontSize: "0.9rem" }}>{m.content}</div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="メッセージを入力..." style={{ flex: 1, background: C.surfaceHigh, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 12, outline: "none" }} />
        <button onClick={send} style={{ background: C.accent, border: "none", color: "white", padding: "0 20px", borderRadius: 12, cursor: "pointer" }}>送信</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. 頼み方フレーズ生成 (ここを大幅に修正)
// ─────────────────────────────────────────────────────────────
const PHRASE_SYSTEM = `あなたは日本の大学のマナーと敬語に精通したエキスパートです。
画像にあるような「不自然な二重敬語」や「教授へのタメ口」は絶対に禁止です。

【出力の掟】
1. 教授・先生が相手の場合：
   - 丁寧：メール等で使える正式な敬語（例：ご多忙の折、誠に恐縮ですが〜いただけますでしょうか）
   - 普通：口頭やチャットで使える丁寧な表現（例：先生、お疲れ様です。〜についてご相談したいのですが）
   - カジュアル：教授にタメ口はあり得ません。少し柔らかい丁寧語にします（例：先生、今お時間よろしいでしょうか？）
2. 友人・同期が相手の場合：
   - カジュアル：大学生が実際に使う自然なタメ口（例：これ、借りてもいいかな？、ごめん今日休みます！）
3. 禁止表現：「ご提供いただかせて」「幸いです（文末の不自然な使用）」「〜借りていいか？」

必ず以下のJSONのみ返してください：
{"polite":"...", "normal":"...", "casual":"...", "tips":"..."}`;

function PhraseTab() {
  const [relation, setRelation] = useState("教授・先生");
  const [request, setRequest] = useState("過去問をもらう");
  const [situation, setSituation] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setResult(null);
    const prompt = `相手：${relation}\n頼みたいこと：${request}\n状況：${situation}\n上記について、大学生が使う最も自然な日本語フレーズを作成してください。`;
    try {
      const text = await askClaude([{ role: "user", content: prompt }], PHRASE_SYSTEM);
      const jsonStr = text.match(/\{[\s\S]*\}/)[0];
      setResult(JSON.parse(jsonStr));
    } catch { setResult({ error: true }); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <select value={relation} onChange={e => setRelation(e.target.value)} style={{ background: C.surfaceHigh, color: C.text, padding: 10, borderRadius: 8, border: `1px solid ${C.border}` }}>
          {["教授・先生", "先輩", "同期・友人", "バイトの上司"].map(r => <option key={r}>{r}</option>)}
        </select>
        <select value={request} onChange={e => setRequest(e.target.value)} style={{ background: C.surfaceHigh, color: C.text, padding: 10, borderRadius: 8, border: `1px solid ${C.border}` }}>
          {["過去問をもらう", "欠席を伝える", "締め切り延期", "質問する"].map(r => <option key={r}>{r}</option>)}
        </select>
      </div>
      <textarea value={situation} onChange={e => setSituation(e.target.value)} placeholder="補足情報（例：メールで送る、面識がない等）" style={{ background: C.surfaceHigh, color: C.text, padding: 12, borderRadius: 8, border: `1px solid ${C.border}`, minHeight: 60 }} />
      <button onClick={generate} disabled={loading} style={{ background: `linear-gradient(135deg, ${C.accentWarm}, #dc2626)`, color: "white", padding: 14, borderRadius: 12, border: "none", fontWeight: 700, cursor: "pointer" }}>
        {loading ? "フレーズを厳選中..." : "✨ フレーズを生成する"}
      </button>

      {result && !result.error && (
        <div className="fadeUp" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {["polite", "normal", "casual"].map(key => (
            <div key={key} style={{ background: C.surfaceHigh, padding: 16, borderRadius: 12, borderLeft: `4px solid ${key === "polite" ? C.accent : key === "normal" ? C.accentGreen : C.accentWarm}` }}>
              <div style={{ fontSize: "0.7rem", color: C.muted, marginBottom: 4 }}>{key.toUpperCase()}</div>
              <div style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>{result[key]}</div>
            </div>
          ))}
          <div style={{ background: "rgba(167,139,250,0.1)", padding: 12, borderRadius: 8, fontSize: "0.85rem", color: C.accent }}>💡 アドバイス: {result.tips}</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. 関係マップ
// ─────────────────────────────────────────────────────────────
function MapTab() {
  return <div style={{ textAlign: "center", color: C.muted, padding: 40 }}>この機能は現在調整中です🗺️</div>;
}

// ─────────────────────────────────────────────────────────────
// 4. 学習相談
// ─────────────────────────────────────────────────────────────
function StudyTab() {
  return <div style={{ textAlign: "center", color: C.muted, padding: 40 }}>学習相談機能もAI相談タブに統合されました📚</div>;
}

// ─────────────────────────────────────────────────────────────
// Root App
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("chat");
  const TABS = [
    { id: "chat", label: "AI相談", icon: "🤝" },
    { id: "phrase", label: "頼み方生成", icon: "✍️" },
    { id: "map", label: "関係マップ", icon: "🗺️" },
    { id: "study", label: "学習相談", icon: "📚" }
  ];

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px" }}>
        <header style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.accentWarm})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: "2rem", fontWeight: 900 }}>RelationAI</h1>
          <p style={{ color: C.muted, fontSize: "0.8rem" }}>大学生のための対人・学習支援ツール</p>
        </header>
        
        <nav style={{ display: "flex", gap: 8, background: C.surface, padding: 6, borderRadius: 16, marginBottom: 20 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: tab === t.id ? C.surfaceHigh : "transparent", color: tab === t.id ? C.accent : C.muted, border: "none", borderRadius: 12, padding: "10px 4px", cursor: "pointer", transition: "0.2s" }}>
              <div style={{ fontSize: "1.2rem" }}>{t.icon}</div>
              <div style={{ fontSize: "0.65rem", fontWeight: 700 }}>{t.label}</div>
            </button>
          ))}
        </nav>

        <main className="fadeUp">
          {tab === "chat" && <ChatTab />}
          {tab === "phrase" && <PhraseTab />}
          {tab === "map" && <MapTab />}
          {tab === "study" && <StudyTab />}
        </main>
      </div>
    </>
  );
}
