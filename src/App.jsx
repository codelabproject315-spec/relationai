import { useState, useRef, useEffect, useCallback } from "react";

// ── Groq API helper (Vercel経由) ──────────────────────────────
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

// ── Global styles injected once ────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: ${C.bg}; color: ${C.text}; font-family: ${FONT}; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: ${C.bg}; }
::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
@keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes ripple { from { transform:scale(0); opacity:0.6; } to { transform:scale(2.5); opacity:0; } }
.fadeUp { animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
.tab-btn:hover { background: ${C.surfaceHigh} !important; }
.send-btn:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); }
.person-card:hover { border-color: ${C.accent} !important; transform: translateY(-2px); }
.quick-btn:hover { background: ${C.surfaceHigh} !important; border-color: ${C.accent} !important; color: ${C.accent} !important; }
`;

// ─────────────────────────────────────────────────────────────
// 1. AIチャット相談
// ─────────────────────────────────────────────────────────────
const CHAT_SYSTEM = `あなたは大学生の対人関係・学習の悩みに寄り添うAIカウンセラー「RelationAI」です。
以下のルールを必ず守って返答してください。

【話し方のルール】
・丁寧だけど堅苦しくない自然な敬語で話す（「〜ですよ」「〜ですね」「〜してみるといいと思います」など）
・「〜でございます」「〜いたします」のような過剰に丁寧な表現は使わない
・友達に相談に乗るような温かみのある口調にする
・「まず、心にしましょう」「以下のポイントを参考にしましょう」のような不自然な表現は使わない
・接続詞や文のつながりが自然になるよう注意する
・「それでは」「以上」などの硬い締めくくりは使わない

【内容のルール】
・相談者の気持ちをまず受け止めてから、具体的なアドバイスを伝える
・対人関係（教授・先輩・友人・グループワーク）、学習、過去問など幅広く対応する
・マークダウン記号（**、##など）は使わず、自然な文章で書く
・返答は長すぎず、読みやすい長さにまとめる`;

const QUICK_TOPICS = [
  "教授へのメールの書き方が分からない",
  "過去問を先輩からもらう方法",
  "グループワークで意見が言えない",
  "友達に頼み事をするのが苦手",
  "授業の理解度が上がらない",
  "試験勉強の計画の立て方",
];

function ChatTab() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "こんにちは！RelationAIです☆\n対人関係や学習のことなど、なんでも気軽に相談してください。どんな悩みでも一緒に考えます。",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(
    async (text) => {
      const content = (text || input).trim();
      if (!content || loading) return;
      setInput("");
      const next = [...messages, { role: "user", content }];
      setMessages(next);
      setLoading(true);
      try {
        const apiMessages = next.slice(1).map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const reply = await askClaude(apiMessages, CHAT_SYSTEM);
        setMessages([...next, { role: "assistant", content: reply }]);
      } catch {
        setMessages([
          ...next,
          { role: "assistant", content: "エラーが発生しました。もう一度お試しください。" },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, messages, loading]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "12px" }}>
      {/* Quick topics */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {QUICK_TOPICS.map((t) => (
          <button
            key={t}
            className="quick-btn"
            onClick={() => send(t)}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              color: C.muted,
              borderRadius: "999px",
              padding: "5px 14px",
              fontSize: "0.78rem",
              cursor: "pointer",
              fontFamily: FONT,
              transition: "all 0.15s",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          padding: "4px 2px",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className="fadeUp"
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              animationDelay: `${i * 0.05}s`,
            }}
          >
            {m.role === "assistant" && (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C.accent}, #7c3aed)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  flexShrink: 0,
                  marginRight: 10,
                  marginTop: 2,
                }}
              >
                🤝
              </div>
            )}
            <div
              style={{
                maxWidth: "75%",
                background:
                  m.role === "user"
                    ? `linear-gradient(135deg, ${C.accent}, #7c3aed)`
                    : C.surfaceHigh,
                color: C.text,
                borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                padding: "12px 16px",
                fontSize: "0.9rem",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.accent}, #7c3aed)`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem",
              }}
            >
              🤝
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {[0, 1, 2].map((d) => (
                <div
                  key={d}
                  style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: C.accent,
                    animation: `pulse 1.2s ease-in-out ${d * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 10 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          placeholder="悩みや相談を入力…（Enterで送信、Shift+Enterで改行）"
          rows={2}
          style={{
            flex: 1, background: C.surfaceHigh, border: `1px solid ${C.border}`,
            borderRadius: 12, color: C.text, padding: "12px 16px",
            fontSize: "0.9rem", fontFamily: FONT, resize: "none", outline: "none",
            lineHeight: 1.6,
          }}
        />
        <button
          className="send-btn"
          onClick={() => send()}
          disabled={!input.trim() || loading}
          style={{
            background: input.trim() && !loading
              ? `linear-gradient(135deg, ${C.accent}, #7c3aed)`
              : C.surfaceHigh,
            border: "none", borderRadius: 12, color: "white",
            width: 52, cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            fontSize: "1.3rem", transition: "all 0.2s", flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. 頼み方フレーズ生成
// ─────────────────────────────────────────────────────────────
const PHRASE_SYSTEM = `あなたは日本語コミュニケーションの専門家です。
大学生が実際に使える「頼み方フレーズ」を3パターン生成してください。

【重要なルール】
・必ず自然な日本語で書く。英語は絶対に使わない
・相手（教授・先輩・友人など）と関係性に合った適切な敬語レベルにする
・「丁寧」は敬語を使った丁寧な表現（例：「〜していただけますでしょうか」「〜いただけると幸いです」）
・「普通」は普通の敬語（例：「〜もらえますか？」「〜お願いしたいのですが」）
・「カジュアル」は相手が友人・後輩など同格か目下の場合のみくだけた表現。教授・先生・上司が相手の場合は丁寧な敬語を使う
・実際に口に出せる・送れる自然な一文にする
・不自然な直訳調や機械的な文体は絶対に使わない

以下のJSON形式のみで返してください（マークダウン・説明文・コードブロック不要）：
{"polite":"...","normal":"...","casual":"...","tips":"一言アドバイス"}`;

const RELATION_TYPES = ["教授・先生", "先輩", "同期・友人", "後輩", "アルバイト先の上司", "グループメンバー"];
const REQUEST_TYPES = ["過去問をもらう", "締め切りを延ばしてもらう", "質問する", "資料を貸してもらう", "一緒に勉強する", "欠席を伝える", "その他"];

function PhraseTab() {
  const [relation, setRelation] = useState("教授・先生");
  const [request, setRequest] = useState("過去問をもらう");
  const [situation, setSituation] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setResult(null);
    const prompt = `【相手】${relation}
【頼みたいこと】${request}
【状況の補足】${situation || "特になし"}

上記の状況で、相手に実際に伝えるフレーズを3パターン（丁寧・普通・カジュアル）、自然な日本語で生成してください。
相手が「${relation}」であることを必ず意識して、適切な敬語レベルにしてください。`;
    try {
      const text = await askClaude([{ role: "user", content: prompt }], PHRASE_SYSTEM);
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
    } catch {
      setResult({ error: true });
    } finally {
      setLoading(false);
    }
  };

  const PATTERNS = [
    { key: "polite", label: "丁寧", color: C.accent, icon: "🎩" },
    { key: "normal", label: "普通", color: C.accentGreen, icon: "😊" },
    { key: "casual", label: "カジュアル", color: C.accentWarm, icon: "✌️" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={{ fontSize: "0.8rem", color: C.muted, display: "block", marginBottom: 6 }}>相手</label>
          <select value={relation} onChange={(e) => setRelation(e.target.value)}
            style={{ width: "100%", background: C.surfaceHigh, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "10px 12px", fontFamily: FONT, fontSize: "0.9rem", outline: "none", cursor: "pointer" }}>
            {RELATION_TYPES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "0.8rem", color: C.muted, display: "block", marginBottom: 6 }}>頼みたいこと</label>
          <select value={request} onChange={(e) => setRequest(e.target.value)}
            style={{ width: "100%", background: C.surfaceHigh, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "10px 12px", fontFamily: FONT, fontSize: "0.9rem", outline: "none", cursor: "pointer" }}>
            {REQUEST_TYPES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={{ fontSize: "0.8rem", color: C.muted, display: "block", marginBottom: 6 }}>状況の補足（任意）</label>
        <textarea value={situation} onChange={(e) => setSituation(e.target.value)}
          placeholder="例：面識はあるが普段あまり話さない。メールで送る予定。"
          rows={2}
          style={{ width: "100%", background: C.surfaceHigh, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "10px 14px", fontFamily: FONT, fontSize: "0.9rem", resize: "none", outline: "none" }} />
      </div>

      <button onClick={generate} disabled={loading}
        style={{
          background: loading ? C.surfaceHigh : `linear-gradient(135deg, ${C.accentWarm}, #dc2626)`,
          border: "none", borderRadius: 12, color: "white", padding: "14px",
          fontSize: "1rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
          fontFamily: FONT, transition: "all 0.2s",
          boxShadow: loading ? "none" : "0 4px 20px rgba(251,146,60,0.35)",
        }}>
        {loading ? (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span style={{ width: 18, height: 18, border: `3px solid rgba(255,255,255,0.3)`, borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
            フレーズを考え中...
          </span>
        ) : "✨ フレーズを生成する"}
      </button>

      {result && !result.error && (
        <div className="fadeUp" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {PATTERNS.map(({ key, label, color, icon }) => (
            <div key={key} style={{ background: C.surfaceHigh, borderRadius: 14, padding: "16px 18px", border: `1px solid ${C.border}`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: color, borderRadius: "4px 0 0 4px" }} />
              <div style={{ paddingLeft: 12 }}>
                <span style={{ fontSize: "0.75rem", color, fontWeight: 700, marginBottom: 6, display: "block" }}>{icon} {label}</span>
                <p style={{ fontSize: "0.95rem", lineHeight: 1.7, color: C.text }}>{result[key]}</p>
                <button onClick={() => navigator.clipboard.writeText(result[key])}
                  style={{ marginTop: 8, background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "4px 12px", fontSize: "0.75rem", cursor: "pointer", fontFamily: FONT }}>
                  コピー
                </button>
              </div>
            </div>
          ))}
          <div style={{ background: `linear-gradient(135deg, rgba(167,139,250,0.1), rgba(124,58,237,0.05))`, border: `1px solid rgba(167,139,250,0.2)`, borderRadius: 12, padding: "12px 16px" }}>
            <span style={{ fontSize: "0.8rem", color: C.accent, fontWeight: 700 }}>💡 ポイント </span>
            <span style={{ fontSize: "0.85rem", color: C.text }}>{result.tips}</span>
          </div>
        </div>
      )}
      {result?.error && (
        <p style={{ color: C.danger, fontSize: "0.9rem" }}>生成に失敗しました。もう一度お試しください。</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. 人間関係マップ
// ─────────────────────────────────────────────────────────────
const CLOSENESS_COLORS = {
  "とても近い": C.accentGreen,
  "普通": C.accent,
  "少し遠い": C.accentWarm,
  "苦手": C.danger,
};

const CATEGORIES = ["友人", "教授・先生", "先輩", "後輩", "バイト仲間", "その他"];

function MapTab() {
  const [people, setPeople] = useState([
    { id: 1, name: "田中教授", category: "教授・先生", closeness: "少し遠い", memo: "質問したいけどハードル高い" },
    { id: 2, name: "佐藤先輩", category: "先輩", closeness: "普通", memo: "過去問持ってるかも" },
    { id: 3, name: "山田さん", category: "友人", closeness: "とても近い", memo: "一緒に勉強できる" },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "友人", closeness: "普通", memo: "" });
  const [advice, setAdvice] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const addPerson = () => {
    if (!form.name.trim()) return;
    setPeople([...people, { ...form, id: Date.now() }]);
    setForm({ name: "", category: "友人", closeness: "普通", memo: "" });
    setShowForm(false);
  };

  const getAdvice = async (person) => {
    setLoadingId(person.id);
    setAdvice(null);
    const prompt = `相手：${person.name}（${person.category}）\n距離感：${person.closeness}\nメモ：${person.memo || "なし"}\n\nこの人との関係改善・うまく付き合うためのアドバイスを3点、具体的に教えてください。`;
    try {
      const text = await askClaude([{ role: "user", content: prompt }],
        "あなたは大学生の人間関係コーチです。丁寧だけど堅苦しくない自然な敬語で（「〜ですね」「〜してみるといいと思います」など）、具体的で実践的なアドバイスを3点、200字以内でまとめてください。マークダウン記号は使わないでください。");
      setAdvice({ person, text });
    } finally {
      setLoadingId(null);
    }
  };

  // Simple visual map using CSS
  const RING_CONFIG = [
    { label: "とても近い", r: 90 },
    { label: "普通", r: 160 },
    { label: "少し遠い", r: 230 },
    { label: "苦手", r: 300 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Map visualization */}
      <div style={{ background: C.surfaceHigh, borderRadius: 16, padding: "20px", border: `1px solid ${C.border}`, overflowX: "auto" }}>
        <div style={{ position: "relative", width: 320, height: 320, margin: "0 auto" }}>
          {/* Rings */}
          {RING_CONFIG.map(({ r, label }) => (
            <div key={label} style={{
              position: "absolute",
              left: "50%", top: "50%",
              width: r * 2, height: r * 2,
              marginLeft: -r, marginTop: -r,
              borderRadius: "50%",
              border: `1px dashed ${C.border}`,
            }} />
          ))}
          {/* Center - self */}
          <div style={{
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(-50%,-50%)",
            width: 48, height: 48, borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.accent}, #7c3aed)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem", zIndex: 10,
            boxShadow: `0 0 20px rgba(167,139,250,0.5)`,
          }}>👤</div>

          {/* People dots */}
          {people.map((p, i) => {
            const ringIdx = RING_CONFIG.findIndex(r => r.label === p.closeness);
            const ring = RING_CONFIG[Math.max(0, ringIdx)];
            const angle = ((i * 137.5) % 360) * (Math.PI / 180);
            const r = ring.r * 0.75;
            const x = 160 + r * Math.cos(angle);
            const y = 160 + r * Math.sin(angle);
            const color = CLOSENESS_COLORS[p.closeness] || C.accent;
            return (
              <div key={p.id} style={{
                position: "absolute",
                left: x, top: y,
                transform: "translate(-50%,-50%)",
                zIndex: 5,
              }}>
                <div title={`${p.name}\n${p.category}\n${p.memo}`} style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: C.surface,
                  border: `2px solid ${color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.65rem", fontWeight: 700, color,
                  cursor: "pointer", boxShadow: `0 0 10px ${color}55`,
                  whiteSpace: "nowrap",
                }}>
                  {p.name.slice(0, 2)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
          {Object.entries(CLOSENESS_COLORS).map(([label, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: C.muted }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* People list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {people.map((p) => (
          <div key={p.id} className="person-card" style={{
            background: C.surfaceHigh, borderRadius: 14, padding: "14px 16px",
            border: `1px solid ${C.border}`, transition: "all 0.2s",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
              background: C.surface, border: `2px solid ${CLOSENESS_COLORS[p.closeness] || C.accent}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.85rem", fontWeight: 700, color: CLOSENESS_COLORS[p.closeness] || C.accent,
            }}>
              {p.name.slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{p.name}</span>
                <span style={{ fontSize: "0.72rem", background: C.surface, color: C.muted, borderRadius: 6, padding: "2px 8px" }}>{p.category}</span>
                <span style={{ fontSize: "0.72rem", color: CLOSENESS_COLORS[p.closeness], fontWeight: 600 }}>{p.closeness}</span>
              </div>
              {p.memo && <p style={{ fontSize: "0.8rem", color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.memo}</p>}
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={() => getAdvice(p)} disabled={loadingId === p.id}
                style={{
                  background: loadingId === p.id ? C.surface : `rgba(167,139,250,0.15)`,
                  border: `1px solid ${C.accent}`, color: C.accent,
                  borderRadius: 8, padding: "5px 12px", fontSize: "0.78rem",
                  cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap",
                }}>
                {loadingId === p.id ? "..." : "AIアドバイス"}
              </button>
              <button onClick={() => setPeople(people.filter(pp => pp.id !== p.id))}
                style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "5px 10px", fontSize: "0.78rem", cursor: "pointer" }}>
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* AI Advice result */}
      {advice && (
        <div className="fadeUp" style={{
          background: `linear-gradient(135deg, rgba(167,139,250,0.08), rgba(124,58,237,0.04))`,
          border: `1px solid rgba(167,139,250,0.25)`, borderRadius: 14, padding: "16px 18px",
        }}>
          <p style={{ fontSize: "0.8rem", color: C.accent, fontWeight: 700, marginBottom: 8 }}>
            💡 {advice.person.name} との関係アドバイス
          </p>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.75, color: C.text, whiteSpace: "pre-wrap" }}>{advice.text}</p>
        </div>
      )}

      {/* Add person form */}
      {showForm ? (
        <div className="fadeUp" style={{ background: C.surfaceHigh, borderRadius: 14, padding: "18px", border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 12 }}>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="名前（例：田中教授）"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "10px 14px", fontFamily: FONT, fontSize: "0.9rem", outline: "none" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "10px 12px", fontFamily: FONT, fontSize: "0.9rem", outline: "none" }}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={form.closeness} onChange={e => setForm({ ...form, closeness: e.target.value })}
              style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "10px 12px", fontFamily: FONT, fontSize: "0.9rem", outline: "none" }}>
              {Object.keys(CLOSENESS_COLORS).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <input value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })}
            placeholder="メモ（任意：どんな悩みがあるか）"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "10px 14px", fontFamily: FONT, fontSize: "0.9rem", outline: "none" }} />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={addPerson} style={{ flex: 1, background: `linear-gradient(135deg, ${C.accent}, #7c3aed)`, border: "none", color: "white", borderRadius: 10, padding: "10px", fontFamily: FONT, fontWeight: 700, cursor: "pointer" }}>追加</button>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 10, padding: "10px", fontFamily: FONT, cursor: "pointer" }}>キャンセル</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}
          style={{ background: C.surfaceHigh, border: `1px dashed ${C.border}`, color: C.muted, borderRadius: 14, padding: "14px", fontFamily: FONT, fontSize: "0.9rem", cursor: "pointer", transition: "all 0.2s" }}>
          ＋ 人物を追加する
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. 学習アドバイス
// ─────────────────────────────────────────────────────────────
const STUDY_SYSTEM = `あなたは大学生の学習コーチです。
以下のルールを必ず守って返答してください。

【話し方のルール】
・丁寧だけど堅苦しくない自然な敬語で話す（「〜ですよ」「〜ですね」「〜してみるといいと思います」など）
・「〜でございます」「〜いたします」のような過剰に丁寧な表現は使わない
・親身になって相談に乗るような温かみのある口調にする
・マークダウン記号（**、##など）は使わず、自然な文章と改行で読みやすくする

【内容のルール】
・試験・授業・資格勉強について具体的で実践的なアドバイスを提供する
・時間管理・暗記法・過去問の活用法・勉強仲間の作り方なども含めてOK`;

const STUDY_TEMPLATES = [
  { icon: "📅", label: "試験まで○日の計画", prompt: "試験まで2週間あります。効率的な勉強計画を教えてください。" },
  { icon: "📚", label: "暗記が苦手", prompt: "暗記が苦手です。効果的な暗記方法を教えてください。" },
  { icon: "😴", label: "集中できない", prompt: "勉強中にすぐ集中力が切れてしまいます。対処法を教えてください。" },
  { icon: "📝", label: "レポートの書き方", prompt: "大学のレポートをうまく書くコツを教えてください。" },
  { icon: "🤝", label: "勉強グループを作りたい", prompt: "勉強グループを作って仲間と勉強したいのですが、どう始めればいいですか？" },
  { icon: "🎯", label: "資格取得の進め方", prompt: "資格試験（例：ITパスポート）に合格するための勉強の進め方を教えてください。" },
];

function StudyTab() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "学習の進め方について相談できます📚\nテンプレートを選ぶか、自由に質問してみてください！" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = useCallback(async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput("");
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setLoading(true);
    try {
      const apiMessages = next.slice(1).map(m => ({ role: m.role, content: m.content }));
      const reply = await askClaude(apiMessages, STUDY_SYSTEM);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "エラーが発生しました。" }]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 14 }}>
      {/* Templates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {STUDY_TEMPLATES.map(t => (
          <button key={t.label} onClick={() => send(t.prompt)}
            style={{
              background: C.surfaceHigh, border: `1px solid ${C.border}`,
              color: C.text, borderRadius: 10, padding: "10px 12px",
              fontSize: "0.82rem", cursor: "pointer", fontFamily: FONT,
              textAlign: "left", display: "flex", alignItems: "center", gap: 8,
              transition: "all 0.15s",
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = C.accentGreen}
            onMouseOut={e => e.currentTarget.style.borderColor = C.border}
          >
            <span style={{ fontSize: "1.1rem" }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, padding: "2px" }}>
        {messages.map((m, i) => (
          <div key={i} className="fadeUp" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "assistant" && (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accentGreen}, #059669)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0, marginRight: 10, marginTop: 2 }}>📚</div>
            )}
            <div style={{
              maxWidth: "75%", background: m.role === "user" ? `linear-gradient(135deg, ${C.accentGreen}, #059669)` : C.surfaceHigh,
              color: C.text, borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              padding: "12px 16px", fontSize: "0.9rem", lineHeight: 1.7, whiteSpace: "pre-wrap",
              boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accentGreen}, #059669)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>📚</div>
            <div style={{ display: "flex", gap: 5 }}>
              {[0, 1, 2].map(d => <div key={d} style={{ width: 8, height: 8, borderRadius: "50%", background: C.accentGreen, animation: `pulse 1.2s ease-in-out ${d * 0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 10 }}>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="学習の悩みを入力…"
          rows={2}
          style={{ flex: 1, background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, padding: "12px 16px", fontSize: "0.9rem", fontFamily: FONT, resize: "none", outline: "none" }} />
        <button className="send-btn" onClick={() => send()} disabled={!input.trim() || loading}
          style={{
            background: input.trim() && !loading ? `linear-gradient(135deg, ${C.accentGreen}, #059669)` : C.surfaceHigh,
            border: "none", borderRadius: 12, color: "white", width: 52,
            cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            fontSize: "1.3rem", transition: "all 0.2s", flexShrink: 0,
          }}>↑</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root App
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "chat", label: "AI相談", icon: "🤝", color: C.accent, component: ChatTab },
  { id: "phrase", label: "頼み方生成", icon: "✍️", color: C.accentWarm, component: PhraseTab },
  { id: "map", label: "関係マップ", icon: "🗺️", color: C.accentGreen, component: MapTab },
  { id: "study", label: "学習相談", icon: "📚", color: C.accentGreen, component: StudyTab },
];

export default function App() {
  const [tab, setTab] = useState("chat");
  const activeTab = TABS.find(t => t.id === tab);
  const ActiveComponent = activeTab?.component;

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", maxWidth: 700, margin: "0 auto", padding: "0 16px 32px" }}>

        {/* Header */}
        <div style={{ padding: "24px 0 16px", textAlign: "center" }}>
          <div style={{ fontSize: "2.2rem", marginBottom: 6 }}>🤝</div>
          <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 900, background: `linear-gradient(135deg, ${C.accent}, ${C.accentWarm})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>
            RelationAI
          </h1>
          <p style={{ color: C.muted, fontSize: "0.85rem" }}>大学生の人間関係・学習をAIがサポート</p>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 6, background: C.surface, borderRadius: 14, padding: 6, marginBottom: 20, border: `1px solid ${C.border}` }}>
          {TABS.map(t => (
            <button key={t.id} className="tab-btn" onClick={() => setTab(t.id)}
              style={{
                flex: 1, background: tab === t.id ? `linear-gradient(135deg, ${t.color}22, ${t.color}11)` : "transparent",
                border: tab === t.id ? `1px solid ${t.color}55` : "1px solid transparent",
                color: tab === t.id ? t.color : C.muted,
                borderRadius: 10, padding: "8px 4px", fontSize: "0.78rem", fontWeight: tab === t.id ? 700 : 400,
                cursor: "pointer", fontFamily: FONT, transition: "all 0.15s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              }}>
              <span style={{ fontSize: "1.1rem" }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div key={tab} className="fadeUp" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: tab === "chat" || tab === "study" ? 500 : "auto" }}>
            {ActiveComponent && <ActiveComponent />}
          </div>
        </div>

      </div>
    </>
  );
}
