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

// ── Global styles ──────────────────────────────────────────────
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
.fadeUp { animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
.tab-btn:hover { background: ${C.surfaceHigh} !important; }
.send-btn:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); }
.person-card:hover { border-color: ${C.accent} !important; transform: translateY(-2px); }
.quick-btn:hover { background: ${C.surfaceHigh} !important; border-color: ${C.accent} !important; color: ${C.accent} !important; }
`;

// ─────────────────────────────────────────────────────────────
// 1. AIチャット相談 (プロンプト改善)
// ─────────────────────────────────────────────────────────────
const CHAT_SYSTEM = `あなたは日本の大学に通う学生に寄り添う、親しみやすくて頼りになる先輩AI「RelationAI」です。

【対話ルール】
・「〜ですよ」「〜だね」「〜してみてはどうかな？」といった、温かみのある自然な日本語で話してください。
・「まず、心にしましょう」「以下のポイントを参考にしてください」といった機械的・翻訳調の表現は絶対に禁止です。
・共感を第一に考え、相手の悩みを否定せず「それは大変だったね」「わかるよ」と受け止めてから具体案を出してください。
・ビジネスメールのような堅苦しい接続詞（および、かつ、然るに等）は使わず、日常会話のトーンを維持してください。
・マークダウン記号（##, **）は使わず、適度な改行で読みやすくしてください。`;

const QUICK_TOPICS = [
  "教授へのメールの書き方",
  "過去問を先輩からもらうコツ",
  "グループワークで意見が言えない",
  "友達に頼み事をするのが苦手",
  "授業についていけない",
  "テスト勉強のやる気が出ない",
];

function ChatTab() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "こんにちは！RelationAIです。大学生活、いろいろ大変なこともあるよね。人間関係のことや勉強のこと、なんでも気軽に話してみて。一緒に解決策を考えよう！",
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
          { role: "assistant", content: "ごめん、ちょっと調子が悪いみたい。もう一回送ってみてくれるかな？" },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, messages, loading]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "12px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {QUICK_TOPICS.map((t) => (
          <button key={t} className="quick-btn" onClick={() => send(t)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted, borderRadius: "999px", padding: "5px 14px", fontSize: "0.78rem", cursor: "pointer", fontFamily: FONT, transition: "all 0.15s" }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", padding: "4px 2px" }}>
        {messages.map((m, i) => (
          <div key={i} className="fadeUp" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animationDelay: `${i * 0.05}s` }}>
            {m.role === "assistant" && (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, #7c3aed)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0, marginRight: 10, marginTop: 2 }}>🤝</div>
            )}
            <div style={{ maxWidth: "75%", background: m.role === "user" ? `linear-gradient(135deg, ${C.accent}, #7c3aed)` : C.surfaceHigh, color: C.text, borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "12px 16px", fontSize: "0.9rem", lineHeight: 1.7, whiteSpace: "pre-wrap", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, #7c3aed)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>🤝</div>
            <div style={{ display: "flex", gap: 5 }}>
              {[0, 1, 2].map((d) => (
                <div key={d} style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent, animation: `pulse 1.2s ease-in-out ${d * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <textarea value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="悩みや相談を入力…（Enterで送信）" rows={2}
          style={{ flex: 1, background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, padding: "12px 16px", fontSize: "0.9rem", fontFamily: FONT, resize: "none", outline: "none", lineHeight: 1.6 }} />
        <button className="send-btn" onClick={() => send()} disabled={!input.trim() || loading}
          style={{ background: input.trim() && !loading ? `linear-gradient(135deg, ${C.accent}, #7c3aed)` : C.surfaceHigh, border: "none", borderRadius: 12, color: "white", width: 52, cursor: input.trim() && !loading ? "pointer" : "not-allowed", fontSize: "1.3rem", transition: "all 0.2s", flexShrink: 0 }}>
          ↑
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. 頼み方フレーズ生成 (プロンプト改善)
// ─────────────────────────────────────────────────────────────
const PHRASE_SYSTEM = `あなたは日本の大学生の人間関係と敬語に精通した、非常に優秀なコミュニケーション講師です。
以下のルールを「鉄の掟」として守り、自然で完璧な日本語のみを生成してください。

【厳守すべき日本語ルール】
1. 違和感のある日本語（例：「提供いただかせてください」「借りていいか？」等）は絶対に出力しない。
2. 相手が「教授・先生」の場合：
   - 丁寧：非常にフォーマル。クッション言葉（お忙しいところ恐縮ですが等）を使い、「〜いただけますでしょうか」「〜幸いです」で締める。
   - 普通：丁寧な敬語（ですます調）。「〜お願いしたく連絡いたしました」等。
   - カジュアル：教授にカジュアルは存在しません。少し柔らかい丁寧語にするか、ゼミの先生なら「〜お願いしてもよろしいでしょうか？」程度に留める。「〜いい？」は絶対に禁止。
3. 相手が「友人」の場合：
   - カジュアル：大学生が実際にLINEで使うような自然なタメ口（「〜持ってたりする？」「〜お願いしたいんだけど！」等）。

【出力形式】
必ず以下のJSON形式のみを返してください。
{"polite":"教授への最も失礼のない表現","normal":"標準的な敬語表現","casual":"相手に合わせた自然な口語","tips":"日本的なマナーのアドバイス"}`;

const RELATION_TYPES = ["教授・先生", "先輩", "同期・友人", "後輩", "バイト先の上司", "グループメンバー"];
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
    const prompt = `相手: ${relation}\n頼み事: ${request}\n状況: ${situation || "特になし"}\n上記に合わせて、自然な日本語のフレーズを作ってください。`;
    try {
      const text = await askClaude([{ role: "user", content: prompt }], PHRASE_SYSTEM);
      // JSONの抽出をより安全に
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const clean = jsonMatch ? jsonMatch[0] : text.replace(/```json|```/g, "").trim();
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
            style={{ width: "100%", background: C.surfaceHigh, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "10px 12px", fontFamily: FONT, fontSize: "0.9rem", outline: "none" }}>
            {RELATION_TYPES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "0.8rem", color: C.muted, display: "block", marginBottom: 6 }}>頼みたいこと</label>
          <select value={request} onChange={(e) => setRequest(e.target.value)}
            style={{ width: "100%", background: C.surfaceHigh, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "10px 12px", fontFamily: FONT, fontSize: "0.9rem", outline: "none" }}>
            {REQUEST_TYPES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={{ fontSize: "0.8rem", color: C.muted, display: "block", marginBottom: 6 }}>状況（任意）</label>
        <textarea value={situation} onChange={(e) => setSituation(e.target.value)}
          placeholder="例：メールで送る。面識はあまりない。" rows={2}
          style={{ width: "100%", background: C.surfaceHigh, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "10px 14px", fontFamily: FONT, fontSize: "0.9rem", resize: "none", outline: "none" }} />
      </div>
      <button onClick={generate} disabled={loading}
        style={{ background: loading ? C.surfaceHigh : `linear-gradient(135deg, ${C.accentWarm}, #dc2626)`, border: "none", borderRadius: 12, color: "white", padding: "14px", fontSize: "1rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: FONT, transition: "all 0.2s" }}>
        {loading ? "考え中..." : "✨ フレーズを生成する"}
      </button>

      {result && !result.error && (
        <div className="fadeUp" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {PATTERNS.map(({ key, label, color, icon }) => (
            <div key={key} style={{ background: C.surfaceHigh, borderRadius: 14, padding: "16px 18px", border: `1px solid ${C.border}`, position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: color, borderRadius: "4px 0 0 4px" }} />
              <div style={{ paddingLeft: 12 }}>
                <span style={{ fontSize: "0.75rem", color, fontWeight: 700, marginBottom: 6, display: "block" }}>{icon} {label}</span>
                <p style={{ fontSize: "0.95rem", lineHeight: 1.7, color: C.text }}>{result[key]}</p>
              </div>
            </div>
          ))}
          <div style={{ background: `rgba(167,139,250,0.1)`, border: `1px solid rgba(167,139,250,0.2)`, borderRadius: 12, padding: "12px 16px" }}>
            <span style={{ fontSize: "0.8rem", color: C.accent, fontWeight: 700 }}>💡 コツ: </span>
            <span style={{ fontSize: "0.85rem", color: C.text }}>{result.tips}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. 人間関係マップ (ロジック維持)
// ─────────────────────────────────────────────────────────────
const CLOSENESS_COLORS = { "とても近い": C.accentGreen, "普通": C.accent, "少し遠い": C.accentWarm, "苦手": C.danger };
const CATEGORIES = ["友人", "教授・先生", "先輩", "後輩", "バイト仲間", "その他"];

function MapTab() {
  const [people, setPeople] = useState([
    { id: 1, name: "田中教授", category: "教授・先生", closeness: "少し遠い", memo: "質問したいけど緊張する" },
    { id: 2, name: "佐藤先輩", category: "先輩", closeness: "普通", memo: "過去問の話を聞きたい" },
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
    const prompt = `相手: ${person.name}(${person.category}), 距離感: ${person.closeness}, メモ: ${person.memo}\nこの人とうまく付き合うコツを日本の大学生の視点で3つ教えて。`;
    try {
      const text = await askClaude([{ role: "user", content: prompt }], "あなたは学生の人間関係コーチです。200字以内で、具体的かつ自然な日本語でアドバイスしてください。");
      setAdvice({ person, text });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {people.map((p) => (
          <div key={p.id} className="person-card" style={{ background: C.surfaceHigh, borderRadius: 14, padding: "14px 16px", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.surface, border: `2px solid ${CLOSENESS_COLORS[p.closeness]}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, color: CLOSENESS_COLORS[p.closeness] }}>{p.name.slice(0, 2)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontWeight: 700 }}>{p.name}</span>
                <span style={{ fontSize: "0.7rem", color: C.muted }}>{p.category}</span>
              </div>
              <p style={{ fontSize: "0.8rem", color: C.muted }}>{p.memo}</p>
            </div>
            <button onClick={() => getAdvice(p)} disabled={loadingId === p.id} style={{ background: "rgba(167,139,250,0.1)", border: `1px solid ${C.accent}`, color: C.accent, borderRadius: 8, padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer" }}>
              {loadingId === p.id ? "..." : "AI助言"}
            </button>
          </div>
        ))}
      </div>
      {advice && (
        <div className="fadeUp" style={{ background: "rgba(167,139,250,0.05)", border: `1px solid ${C.accent}44`, borderRadius: 12, padding: "16px" }}>
          <p style={{ fontSize: "0.85rem", color: C.text }}>{advice.text}</p>
        </div>
      )}
      {showForm ? (
        <div style={{ background: C.surfaceHigh, padding: 16, borderRadius: 14, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="名前" style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: 10, borderRadius: 8, outline: "none" }} />
          <button onClick={addPerson} style={{ background: C.accent, color: "white", border: "none", padding: 10, borderRadius: 8, fontWeight: 700 }}>追加</button>
          <button onClick={() => setShowForm(false)} style={{ background: "transparent", color: C.muted, border: "none" }}>キャンセル</button>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} style={{ background: "transparent", border: `1px dashed ${C.border}`, color: C.muted, padding: 12, borderRadius: 14, cursor: "pointer" }}>＋ 人物を追加</button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. 学習アドバイス (プロンプト改善)
// ─────────────────────────────────────────────────────────────
const STUDY_SYSTEM = `あなたは大学生の学習をサポートする頼もしい専属コーチです。

【対話ルール】
・「〜だよ」「〜ですね」といった、前向きで親しみやすい日本語で回答してください。
・翻訳調の硬い表現や、上から目線の指導は避け、一緒に伴走するような姿勢を見せてください。
・レポート作成、試験対策、資格勉強などに対し、日本の大学独自の文化（シラバス、出席点、過去問等）を踏まえた具体的な助言をしてください。
・一度に情報を詰め込みすぎず、まずは一歩踏み出せるようなアドバイスを心がけてください。`;

const STUDY_TEMPLATES = [
  { icon: "📅", label: "試験までの計画", prompt: "試験まで2週間。効率的な計画を立てたいです。" },
  { icon: "📚", label: "暗記のコツ", prompt: "暗記が苦手です。いい方法ありませんか？" },
  { icon: "📝", label: "レポート作成", prompt: "レポートの構成がうまく作れません。コツを教えて。" },
  { icon: "🎯", label: "資格勉強", prompt: "ITパスポートなどの資格、どう進めればいい？" },
];

function StudyTab() {
  const [messages, setMessages] = useState([{ role: "assistant", content: "勉強の調子はどう？試験対策からレポートの書き方まで、なんでも相談に乗るよ！" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const send = useCallback(async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput("");
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setLoading(true);
    try {
      const reply = await askClaude(next.slice(1), STUDY_SYSTEM);
      setMessages([...next, { role: "assistant", content: reply }]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {STUDY_TEMPLATES.map(t => (
          <button key={t.label} onClick={() => send(t.prompt)} style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, padding: "10px", fontSize: "0.8rem", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "80%", background: m.role === "user" ? C.accentGreen : C.surfaceHigh, color: m.role === "user" ? "black" : C.text, padding: "10px 14px", borderRadius: 14, fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>{m.content}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="学習の相談…" style={{ flex: 1, background: C.surfaceHigh, border: `1px solid ${C.border}`, color: C.text, padding: 12, borderRadius: 12, outline: "none" }} />
        <button onClick={() => send()} style={{ background: C.accentGreen, color: "black", border: "none", padding: "0 20px", borderRadius: 12, fontWeight: 700 }}>送信</button>
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
        <div style={{ padding: "24px 0 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, background: `linear-gradient(135deg, ${C.accent}, ${C.accentWarm})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>RelationAI</h1>
          <p style={{ color: C.muted, fontSize: "0.85rem" }}>大学生の毎日をAIがちょっと楽にする</p>
        </div>
        <div style={{ display: "flex", gap: 6, background: C.surface, borderRadius: 14, padding: 6, marginBottom: 20, border: `1px solid ${C.border}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: tab === t.id ? `${t.color}22` : "transparent", border: "none", color: tab === t.id ? t.color : C.muted, borderRadius: 10, padding: "8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: "1.2rem" }}>{t.icon}</span><span style={{ fontSize: "0.7rem", fontWeight: 700 }}>{t.label}</span>
            </button>
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </>
  );
}
