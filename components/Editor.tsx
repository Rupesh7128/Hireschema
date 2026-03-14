
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import {
    FileText, Mail, MessageSquare, GraduationCap,
    Download, Printer, RefreshCw,
    Check, ChevronDown, Wand2, Copy,
    Edit2, Send, Loader2, Sparkles, X,
} from 'lucide-react';
import { FileData, AnalysisResult, GeneratorType } from '../types';
import { generateContent, calculateDeterministicDualScore, calculateDeterministicRelevanceScore, refineContent, refineAtsResumeContent, regenerateSection } from '../services/aiService';
import { normalizeAtsResumeMarkdown } from '../services/atsResumeMarkdown';
import { includesKeyword, prioritizeKeywords } from '../services/keywordUtils';
import { extractKeywords, getImpliedJdSkills } from '../services/engine/keywordExtraction';
import { ABBREVIATIONS } from '../services/engine/skillDatabase';
import { validateResumeMarkdown, type ResumeComplianceReport, type KeywordJustification } from '../services/resumeCompliance';
import { PdfTemplate } from './PdfTemplate';
import { CoverLetterEditor } from './CoverLetterEditor';
import { LoadingIndicator } from './LoadingIndicator';

interface EditorProps {
    analysisId?: string | null;
    resumeFile: FileData;
    resumeText?: string;
    jobDescription: string;
    analysis: AnalysisResult;
    isPaid: boolean;
    onDownloadComplete?: () => void; // New prop for post-download actions
    appLanguage: string;
    setAppLanguage: (lang: string) => void;
}

const ACCENT_COLORS = [
    { name: 'Pure Orange', value: '#F97316' },
    { name: 'Zinc White', value: '#F4F4F5' },
    { name: 'Muted Gray', value: '#71717A' },
];

const LANGUAGES = [
    "English", "Spanish", "French", "German", "Hindi", "Portuguese", "Japanese", "Korean"
];


export const Editor: React.FC<EditorProps> = ({
    analysisId,
    resumeFile,
    resumeText = '',
    jobDescription,
    analysis,
    isPaid,
    onDownloadComplete,
    appLanguage,
    setAppLanguage
}) => {
    // --- STATE ---
    const [activeTab, setActiveTab] = useState<GeneratorType>(GeneratorType.ATS_RESUME);
    const [generatedData, setGeneratedData] = useState<Record<string, string>>({});
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [generationErrors, setGenerationErrors] = useState<Record<string, string>>({});
    const [progressMessages, setProgressMessages] = useState<Record<string, string>>({});
    const [optimizedScoring, setOptimizedScoring] = useState<{ atsScore: number, recruiterScore: number } | null>(null);
    const [optimizedRelevanceScore, setOptimizedRelevanceScore] = useState<number | null>(null);
    const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0]);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [isRefining, setIsRefining] = useState(false);
    const [refineLabel, setRefineLabel] = useState<string>("");
    const [localResumeText, setLocalResumeText] = useState(resumeText);
    const [isEditing, setIsEditing] = useState(false);
    const [isCompare, setIsCompare] = useState(false);
    const [compareSliderPosition, setCompareSliderPosition] = useState(50);
    const [isCompareSliderDragging, setIsCompareSliderDragging] = useState(false);
    const [showCopyToast, setShowCopyToast] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [removeRiskyKeywords, setRemoveRiskyKeywords] = useState(false);
    const [complianceReports, setComplianceReports] = useState<Record<string, ResumeComplianceReport | null>>({});
    const [isComplianceOpen, setIsComplianceOpen] = useState(false);
    const [keywordApplyStatus, setKeywordApplyStatus] = useState<Record<string, boolean>>({});

    const pdfRef = useRef<HTMLDivElement>(null);
    const previewPdfRef = useRef<HTMLDivElement>(null);
    const kitPdfRef = useRef<HTMLDivElement>(null);
    const lastLanguageRef = useRef(appLanguage);
    const autoKitGeneratedRef = useRef(false);
    const progressTimersRef = useRef<Record<string, number>>({});
    const compareContainerRef = useRef<HTMLDivElement>(null);
    const compareBeforeScrollRef = useRef<HTMLDivElement>(null);
    const compareAfterScrollRef = useRef<HTMLDivElement>(null);
    const compareScrollSyncRef = useRef<'before' | 'after' | null>(null);
    const complianceRunRef = useRef(0);

    const updateCompareSliderFromClientX = useCallback((clientX: number) => {
        const el = compareContainerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const raw = ((clientX - rect.left) / rect.width) * 100;
        const next = Math.min(95, Math.max(5, raw));
        setCompareSliderPosition(next);
    }, []);

    useEffect(() => {
        if (!isCompareSliderDragging) return;

        const handleMouseMove = (e: MouseEvent) => updateCompareSliderFromClientX(e.clientX);
        const handleMouseUp = () => setIsCompareSliderDragging(false);
        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches && e.touches[0]) updateCompareSliderFromClientX(e.touches[0].clientX);
        };
        const handleTouchEnd = () => setIsCompareSliderDragging(false);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isCompareSliderDragging, updateCompareSliderFromClientX]);

    useEffect(() => {
        return () => {
            for (const key of Object.keys(progressTimersRef.current)) {
                window.clearInterval(progressTimersRef.current[key]);
            }
            progressTimersRef.current = {};
        };
    }, []);

    useEffect(() => {
        if (!isCompare) return;
        setCompareSliderPosition(50);
    }, [isCompare, activeTab]);

    const getLanguageGuardrail = () => (
        appLanguage !== "English"
            ? `CRITICAL LANGUAGE RULE: Return the final output entirely in ${appLanguage}. Do not mix in English headings or bullets.`
            : `CRITICAL LANGUAGE RULE: Return the final output entirely in English.`
    );

    const isMeaningfulText = (value: string) => {
        const trimmed = (value || '').trim();
        if (!trimmed) return false;
        const lowered = trimmed.toLowerCase();
        return !['not provided', 'n/a', 'na', 'none', 'null', 'undefined', '-'].includes(lowered);
    };

    const normalizeUrl = (value: string) => {
        const trimmed = (value || '').trim();
        if (!trimmed) return '';
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return `https://${trimmed.replace(/^\/+/, '')}`;
    };

    const toTelHref = (value: string) => {
        const digits = (value || '').replace(/[^\d+]/g, '');
        return digits ? `tel:${digits}` : '';
    };

    const renderContactHeader = () => {
        if (activeTab !== GeneratorType.ATS_RESUME) return null;
        const profile = analysis.contactProfile || { name: '', email: '', phone: '', linkedin: '', location: '' };
        const name = (profile.name || '').trim();
        const email = (profile.email || '').trim();
        const phone = (profile.phone || '').trim();
        const linkedin = (profile.linkedin || '').trim();
        const location = (profile.location || '').trim();

        const items: Array<{ key: string; node: React.ReactNode }> = [
            isMeaningfulText(phone) ? { key: 'phone', node: <a className="hover:underline" href={toTelHref(phone)}>{phone}</a> } : null,
            isMeaningfulText(email) ? { key: 'email', node: <a className="hover:underline" href={`mailto:${email}`}>{email}</a> } : null,
            isMeaningfulText(location) ? { key: 'location', node: <span>{location}</span> } : null,
            isMeaningfulText(linkedin)
                ? { key: 'linkedin', node: <a className="hover:underline" href={normalizeUrl(linkedin)} target="_blank" rel="noopener noreferrer">LinkedIn</a> }
                : null
        ].filter(Boolean) as Array<{ key: string; node: React.ReactNode }>;

        if (!name && items.length === 0) return null;

        return (
            <div className="mb-6">
                {name && (
                    <h1 className="text-4xl font-black uppercase tracking-tight mb-2 border-b-2 pb-2 text-black" style={{ borderColor: accentColor.value }}>
                        {name}
                    </h1>
                )}
                {items.length > 0 && (
                    <p className="text-sm text-zinc-700 font-bold">
                        {items.map((item, idx) => (
                            <React.Fragment key={item.key}>
                                {idx > 0 && <span className="px-2 text-zinc-400">•</span>}
                                {item.node}
                            </React.Fragment>
                        ))}
                    </p>
                )}
            </div>
        );
    };

    const markdownToPlainText = (markdown: string) => {
        const input = (markdown || '').replace(/\r\n/g, '\n');
        const withoutLinks = input.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
        const withoutFormatting = withoutLinks
            .replace(/[*_`>#]/g, '')
            .replace(/^\s*[-+]\s+/gm, '')
            .replace(/^\s*\d+\.\s+/gm, '')
            .replace(/\s+/g, ' ')
            .replace(/\n\s+/g, '\n')
            .trim();
        return withoutFormatting;
    };

    const normalizeLine = (line: string) => line.trim().toLowerCase().replace(/\s+/g, ' ');

    const buildOptimizedPlainText = () => {
        const profile = analysis.contactProfile || { name: '', email: '', phone: '', linkedin: '', location: '' };
        const name = isMeaningfulText(profile.name) ? profile.name.trim() : '';
        const parts = [
            isMeaningfulText(profile.phone) ? profile.phone.trim() : '',
            isMeaningfulText(profile.email) ? profile.email.trim() : '',
            isMeaningfulText(profile.location) ? profile.location.trim() : '',
            isMeaningfulText(profile.linkedin) ? `LinkedIn: ${normalizeUrl(profile.linkedin.trim())}` : ''
        ].filter(Boolean);
        const header = [name, parts.join(' • ')].filter(Boolean).join('\n');
        const body = markdownToPlainText(generatedData[activeTab] || '');
        return [header, body].filter(Boolean).join('\n');
    };

    type CompareRowKind = 'equal' | 'delete' | 'insert' | 'replace';
    type CompareRow = {
        kind: CompareRowKind;
        before: string;
        after: string;
        beforeTooltip?: string;
        afterTooltip?: string;
    };

    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const renderKeywordHighlights = (line: string, keywords: string[]) => {
        const rawKeywords = (keywords || []).filter(Boolean).slice(0, 30);
        if (rawKeywords.length === 0) return [line];
        const escaped = rawKeywords.map((k) => escapeRegExp(String(k || '').trim())).filter(Boolean);
        if (escaped.length === 0) return [line];
        const re = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(line)) !== null) {
            const start = m.index;
            const end = start + m[0].length;
            if (start > lastIndex) parts.push(line.slice(lastIndex, start));
            parts.push(
                <span
                    key={`${start}-${end}`}
                    className="bg-orange-500/15 text-zinc-900 rounded-sm"
                >
                    {line.slice(start, end)}
                </span>
            );
            lastIndex = end;
        }
        if (lastIndex < line.length) parts.push(line.slice(lastIndex));
        return parts.length > 0 ? parts : [line];
    };

    const lineIncludesAnyKeyword = (line: string, keywords: string[]) => {
        const out: string[] = [];
        for (const k of (keywords || []).filter(Boolean).slice(0, 30)) {
            const term = String(k || '').trim();
            if (!term) continue;
            if (includesKeyword(line, term)) out.push(term);
        }
        return out;
    };

    const getLineInsights = (line: string, keywords: string[]) => {
        const insights: string[] = [];
        const trimmed = (line || '').trim();
        if (!trimmed) return insights;

        const keywordHits = lineIncludesAnyKeyword(trimmed, keywords).slice(0, 4);
        if (keywordHits.length > 0) insights.push(`Keywords: ${keywordHits.join(', ')}`);

        if (/^##\s+/.test(trimmed)) insights.push('ATS: section heading structured for parsing');
        if (/^[-*]\s+/.test(trimmed)) insights.push('ATS: bullet formatting normalized');
        if (/\b(ATS|Applicant Tracking System)\b/i.test(trimmed)) insights.push('ATS: compatibility note added');
        if (/(?:^|[^\d])(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?%?\b/.test(trimmed) || /\$\s*\d/.test(trimmed)) {
            insights.push('Impact: quantifiable metric added');
        }

        const verb = trimmed.replace(/^[-*]\s+/, '').split(/\s+/)[0]?.toLowerCase() || '';
        const actionVerbs = new Set([
            'led', 'built', 'improved', 'increased', 'reduced', 'delivered', 'launched', 'owned', 'managed',
            'designed', 'implemented', 'optimized', 'automated', 'streamlined', 'analyzed', 'created', 'developed'
        ]);
        if (actionVerbs.has(verb)) insights.push('Clarity: action-led bullet phrasing');

        return insights;
    };

    const buildLineOps = (a: string[], b: string[]) => {
        const n = a.length;
        const m = b.length;
        const maxCells = 160000;
        if (n * m > maxCells) {
            const ops: Array<{ type: 'equal' | 'delete' | 'insert'; text: string }> = [];
            const maxLen = Math.max(n, m);
            for (let i = 0; i < maxLen; i += 1) {
                const left = a[i];
                const right = b[i];
                if (typeof left === 'string' && typeof right === 'string' && left === right) {
                    ops.push({ type: 'equal', text: left });
                } else {
                    if (typeof left === 'string') ops.push({ type: 'delete', text: left });
                    if (typeof right === 'string') ops.push({ type: 'insert', text: right });
                }
            }
            return ops;
        }

        const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
        for (let i = n - 1; i >= 0; i -= 1) {
            for (let j = m - 1; j >= 0; j -= 1) {
                if (a[i] === b[j]) dp[i][j] = (dp[i + 1][j + 1] + 1) as any;
                else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }

        const ops: Array<{ type: 'equal' | 'delete' | 'insert'; text: string }> = [];
        let i = 0;
        let j = 0;
        while (i < n && j < m) {
            if (a[i] === b[j]) {
                ops.push({ type: 'equal', text: a[i] });
                i += 1;
                j += 1;
            } else if (dp[i + 1][j] >= dp[i][j + 1]) {
                ops.push({ type: 'delete', text: a[i] });
                i += 1;
            } else {
                ops.push({ type: 'insert', text: b[j] });
                j += 1;
            }
        }
        while (i < n) {
            ops.push({ type: 'delete', text: a[i] });
            i += 1;
        }
        while (j < m) {
            ops.push({ type: 'insert', text: b[j] });
            j += 1;
        }
        return ops;
    };

    const buildCompareRows = (originalLines: string[], optimizedLines: string[], keywords: string[]): CompareRow[] => {
        const ops = buildLineOps(originalLines, optimizedLines);
        const rows: CompareRow[] = [];

        let idx = 0;
        while (idx < ops.length) {
            const op = ops[idx];
            if (op.type === 'equal') {
                rows.push({ kind: 'equal', before: op.text, after: op.text });
                idx += 1;
                continue;
            }

            const del: string[] = [];
            const ins: string[] = [];
            while (idx < ops.length && ops[idx].type === 'delete') {
                del.push(ops[idx].text);
                idx += 1;
            }
            while (idx < ops.length && ops[idx].type === 'insert') {
                ins.push(ops[idx].text);
                idx += 1;
            }

            const maxLen = Math.max(del.length, ins.length);
            for (let k = 0; k < maxLen; k += 1) {
                const before = del[k] ?? '';
                const after = ins[k] ?? '';
                const kind: CompareRowKind =
                    before && after ? 'replace' : before ? 'delete' : 'insert';

                const beforeInsights = before ? getLineInsights(before, keywords) : [];
                const afterInsights = after ? getLineInsights(after, keywords) : [];

                rows.push({
                    kind,
                    before,
                    after,
                    beforeTooltip: beforeInsights.length > 0 ? beforeInsights.join('\n') : before ? 'Removed/rewritten line' : undefined,
                    afterTooltip: afterInsights.length > 0 ? afterInsights.join('\n') : after ? 'Added/rewritten line' : undefined
                });
            }
        }

        return rows;
    };

    const compareModel = useMemo(() => {
        if (!isCompare) return null;
        const original = (localResumeText || '').trim();
        const optimized = buildOptimizedPlainText();
        const keywords = (analysis.missingKeywords || []).filter(Boolean);
        const originalLines = original.length ? original.split(/\r?\n/) : [];
        const optimizedLines = optimized.length ? optimized.split(/\r?\n/) : [];
        const rows = buildCompareRows(originalLines, optimizedLines, keywords);

        let added = 0;
        let removed = 0;
        let modified = 0;
        for (const r of rows) {
            if (r.kind === 'insert') added += 1;
            else if (r.kind === 'delete') removed += 1;
            else if (r.kind === 'replace') modified += 1;
        }

        return { rows, keywords, stats: { added, removed, modified } };
    }, [isCompare, localResumeText, activeTab, generatedData[activeTab], analysis.contactProfile, analysis.missingKeywords]);

    const renderCompareView = () => {
        const model = compareModel;
        const rows = model?.rows || [];
        const keywords = model?.keywords || [];
        const stats = model?.stats || { added: 0, removed: 0, modified: 0 };

        const syncScroll = (source: 'before' | 'after') => {
            const beforeEl = compareBeforeScrollRef.current;
            const afterEl = compareAfterScrollRef.current;
            if (!beforeEl || !afterEl) return;
            if (compareScrollSyncRef.current && compareScrollSyncRef.current !== source) return;
            compareScrollSyncRef.current = source;
            const src = source === 'before' ? beforeEl : afterEl;
            const dst = source === 'before' ? afterEl : beforeEl;
            dst.scrollTop = src.scrollTop;
            requestAnimationFrame(() => {
                compareScrollSyncRef.current = null;
            });
        };

        const getRowClass = (kind: CompareRowKind, side: 'before' | 'after') => {
            if (kind === 'equal') return 'text-zinc-800';
            if (kind === 'delete' && side === 'before') return 'bg-red-50 text-red-900';
            if (kind === 'insert' && side === 'after') return 'bg-emerald-50 text-emerald-900';
            if (kind === 'replace') return side === 'before' ? 'bg-amber-50 text-amber-900' : 'bg-amber-50 text-amber-900';
            return 'text-zinc-400';
        };

        const renderLineWithTooltip = (line: string, tooltip?: string, content?: React.ReactNode) => {
            const hasTip = Boolean(tooltip && tooltip.trim());
            return (
                <span className="relative group block" title={hasTip ? tooltip : undefined} tabIndex={hasTip ? 0 : -1}>
                    <span className="block">{content ?? (line || ' ')}</span>
                    {hasTip && (
                        <span className="pointer-events-none absolute left-0 top-full mt-1 hidden group-hover:block group-focus-within:block z-20 max-w-[320px] whitespace-pre-wrap rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] font-sans text-zinc-900 shadow-xl">
                            {tooltip}
                        </span>
                    )}
                </span>
            );
        };

        return (
            <div className="w-full">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Before vs After</div>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500">
                        <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-sm bg-emerald-500/60 border border-emerald-600/40" />
                            {stats.added} added
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-sm bg-red-500/60 border border-red-600/40" />
                            {stats.removed} removed
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-sm bg-amber-500/60 border border-amber-600/40" />
                            {stats.modified} modified
                        </span>
                    </div>
                </div>

                <div
                    ref={compareContainerRef}
                    className="relative w-full h-[700px] border border-zinc-200 rounded-sm overflow-hidden bg-white"
                >
                    <div
                        ref={compareAfterScrollRef}
                        onScroll={() => syncScroll('after')}
                        className="absolute inset-0 overflow-auto font-mono text-xs"
                    >
                        {rows.map((row, idx) => (
                            <div key={idx} className={`px-3 py-0.5 whitespace-pre ${getRowClass(row.kind, 'after')}`}>
                                {renderLineWithTooltip(
                                    row.after || ' ',
                                    row.afterTooltip,
                                    row.after ? renderKeywordHighlights(row.after, keywords) : ' '
                                )}
                            </div>
                        ))}
                    </div>

                    <div
                        ref={compareBeforeScrollRef}
                        onScroll={() => syncScroll('before')}
                        style={{ clipPath: `polygon(0 0, ${compareSliderPosition}% 0, ${compareSliderPosition}% 100%, 0 100%)` }}
                        className="absolute inset-0 overflow-auto font-mono text-xs bg-white"
                    >
                        {rows.map((row, idx) => (
                            <div key={idx} className={`px-3 py-0.5 whitespace-pre ${getRowClass(row.kind, 'before')}`}>
                                {renderLineWithTooltip(row.before || ' ', row.beforeTooltip)}
                            </div>
                        ))}
                    </div>

                    <div className="absolute inset-y-0 w-[2px] bg-orange-500" style={{ left: `${compareSliderPosition}%` }} />
                    <button
                        type="button"
                        aria-label="Drag to compare"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsCompareSliderDragging(true);
                            updateCompareSliderFromClientX(e.clientX);
                        }}
                        onTouchStart={(e) => {
                            const t = e.touches?.[0];
                            if (!t) return;
                            setIsCompareSliderDragging(true);
                            updateCompareSliderFromClientX(t.clientX);
                        }}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white border border-zinc-200 shadow-lg flex items-center justify-center cursor-col-resize"
                        style={{ left: `${compareSliderPosition}%` }}
                    >
                        <div className="w-1 h-4 bg-zinc-300 rounded-full mr-1" />
                        <div className="w-1 h-4 bg-zinc-300 rounded-full" />
                    </button>

                    <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-white/90 border border-zinc-200 text-[10px] font-black uppercase tracking-widest text-zinc-700">
                        Before
                    </div>
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-white/90 border border-zinc-200 text-[10px] font-black uppercase tracking-widest text-zinc-700">
                        After
                    </div>
                </div>
            </div>
        );
    };

    // --- INITIALIZATION & AUTO-GENERATION ---
    useEffect(() => {
        setLocalResumeText(resumeText || '');
    }, [resumeText]);

    const dedupeKeywords = (keywords: string[]) => {
        const out: string[] = [];
        const seen = new Set<string>();
        for (const k of keywords.filter(Boolean)) {
            const key = k.trim().toLowerCase();
            if (!key || seen.has(key)) continue;
            seen.add(key);
            out.push(k.trim());
        }
        return out;
    };

    const getEvidenceBackedMissingKeywords = (resumeText: string, missingKeywords: string[], limit = 14) => {
        return prioritizeKeywords(missingKeywords || [])
            .filter((k) => includesKeyword(resumeText, k))
            .slice(0, limit);
    };

    const buildTargetKeywordsForCompliance = (resumeText: string, jd: string, missingKeywords: string[], markdown = '') => {
        const mustInclude = getMustIncludeSkills(resumeText, jd);
        const jdSignals = getEvidenceBackedMissingKeywords(resumeText, missingKeywords, 16);
        // Supplement with full JD keyword DB extraction so semanticSkill scores against
        // the actual keyword set — not just the originally-missing subset
        const jdDbKeywords = extractKeywords(jd).map(k => k.normalized);
        const highRisk = ['Excel', 'Large Data Sets', 'Inventory Management', 'Customer Experience'];
        const context = `${resumeText}\n${jd}\n${markdown}`;
        const relevantHighRisk = highRisk.filter((term) => includesKeyword(context, term));
        return dedupeKeywords([...mustInclude, ...jdSignals, ...jdDbKeywords, ...relevantHighRisk]).slice(0, 35);
    };

    const ensureKeywordInSkillsSection = (markdown: string, keyword: string) => {
        const term = (keyword || '').trim();
        if (!term) return markdown;
        if (includesKeyword(markdown, term)) return markdown;

        const lines = (markdown || '').split('\n');
        const SKILLS_HEADER_RE = /^##\s+(SKILLS|HABILIDADES|COMP[ÉE]TENCES|F[ÄA]HIGKEITEN|COMPETENZE|COMPETÊNCIAS|НАВЫКИ|КОМПЕТЕНЦИИ)\s*$/i;
        let skillsHeaderIdx = lines.findIndex((line) => SKILLS_HEADER_RE.test(line.trim()));

        if (skillsHeaderIdx === -1) {
            const appended = `${markdown.trim()}\n\n## SKILLS\n${term}`;
            return normalizeAtsResumeMarkdown(appended);
        }

        // Find the end of the skills section (next ## header or end of file)
        let sectionEnd = lines.length;
        for (let i = skillsHeaderIdx + 1; i < lines.length; i++) {
            if (/^##\s+/.test(lines[i].trim())) { sectionEnd = i; break; }
        }
        const sectionLines = lines.slice(skillsHeaderIdx + 1, sectionEnd);

        // Detect if the section uses "Category: skills" format
        const categoryLineRe = /^(.+?):\s+(.+)$/;
        const categoryLines = sectionLines
            .map((l, i) => ({ line: l.trim(), idx: skillsHeaderIdx + 1 + i }))
            .filter(({ line }) => categoryLineRe.test(line) && !line.startsWith('-') && !line.startsWith('*'));

        if (categoryLines.length > 0) {
            // Append to the last category line (most general / catch-all)
            const target = categoryLines[categoryLines.length - 1];
            lines[target.idx] = `${lines[target.idx].trimEnd()}, ${term}`;
        } else {
            // Plain list format — insert as bare text (no dash) right after the header
            let insertAt = skillsHeaderIdx + 1;
            while (insertAt < lines.length && lines[insertAt].trim() === '') insertAt += 1;
            lines.splice(insertAt, 0, term);
        }
        return normalizeAtsResumeMarkdown(lines.join('\n'));
    };

    const ensureKeywordsInSkillsSection = (markdown: string, keywords: string[]) => {
        let out = markdown;
        for (const keyword of dedupeKeywords(keywords)) {
            out = ensureKeywordInSkillsSection(out, keyword);
        }
        return out;
    };

    const getExperienceBulletCounts = (markdown: string) => {
        const lines = (markdown || '').split('\n');
        const counts: number[] = [];
        let inExperience = false;
        let current = 0;
        for (const raw of lines) {
            const line = raw.trim();
            if (/^##\s+EXPERIENCE\s*$/i.test(line)) {
                inExperience = true;
                current = 0;
                continue;
            }
            if (inExperience && /^##\s+/.test(line) && !/^##\s+EXPERIENCE\s*$/i.test(line)) {
                if (current > 0) counts.push(current);
                break;
            }
            if (!inExperience) continue;
            if (/^###\s+/.test(line)) {
                if (current > 0) counts.push(current);
                current = 0;
                continue;
            }
            if (/^[-*]\s+/.test(line)) current += 1;
        }
        if (inExperience && current > 0) counts.push(current);
        return counts;
    };

    const shouldApplyDefaultAlternative = (keyword: string, originalResume: string) => {
        const key = (keyword || '').trim().toLowerCase();
        const t = (originalResume || '').toLowerCase();
        if (!key || !t) return false;
        if (key === 'excel') {
            return /\b(excel|spreadsheet|pivot|vlookup|lookup|model|forecast|dashboard|report|analysis|tracking)\b/i.test(t);
        }
        if (key === 'large data sets') {
            return /\b(\d{1,3}(?:,\d{3})+|\d{4,})\b/.test(t) || /\b(million|billion|thousand|tb|gb|records|rows|transactions)\b/i.test(t);
        }
        if (key === 'inventory management') {
            const hasInventory = /\b(inventory|stock|warehouse|replenish|replenishment|demand planning|procurement|supply)\b/i.test(t);
            const hasOwnership = /\b(owned|accountable|responsible for|led|managed|end-to-end|oversaw)\b/i.test(t);
            return hasInventory && hasOwnership;
        }
        if (key === 'customer experience') {
            return /\b(customer|client|support|service|satisfaction|nps|csat|complaint|tickets|calls)\b/i.test(t);
        }
        return false;
    };

    const applyDefaultAlternatives = (report: ResumeComplianceReport, markdown: string) => {
        let out = markdown;
        const rows = (report.keyword_justifications || []).filter((k) => (
            !k.used &&
            !k.alternative_applied &&
            Boolean(k.alternative_used) &&
            (k.risk_level === 'high')
        ));
        for (const row of rows) {
            const alt = (row.alternative_used || '').trim();
            if (!alt) continue;
            if (!shouldApplyDefaultAlternative(row.keyword, localResumeText)) continue;
            out = ensureKeywordInSkillsSection(out, alt);
        }
        return out;
    };

    const buildAutofixInstruction = (report: ResumeComplianceReport, preserveList: string[] = []) => {
        const hard = report.issues.filter(i => i.severity === 'hard');
        const needRemove = hard.filter(i => i.validator === 'experience_evidence' || i.validator === 'remove_risky_keywords');
        const needFreq = hard.filter(i => i.validator === 'keyword_frequency');
        const needMirror = hard.filter(i => i.validator === 'jd_phrase_mirroring');
        const preserveEvidenceBacked = dedupeKeywords(
            report.keyword_justifications
                .filter((k) => k.used && includesKeyword(localResumeText, k.keyword))
                .map((k) => k.keyword)
        );

        const removals = dedupeKeywords(
            needRemove
                .map(i => String(i.details?.keyword || '').trim())
                .filter(Boolean)
        );

        const freqKeywords = dedupeKeywords(
            needFreq
                .map(i => String(i.details?.keyword || '').trim())
                .filter(Boolean)
        );

        const replacementHints = removals
            .map(k => {
                const row = report.keyword_justifications.find(j => (j.keyword || '').toLowerCase() === k.toLowerCase());
                if (!row?.alternative_used) return '';
                return `${k} → ${row.alternative_used}`;
            })
            .filter(Boolean);

        const allPreserve = dedupeKeywords([...preserveEvidenceBacked, ...preserveList]);

        return [
            `Run the HireSchema rule validators and fix violations without inventing experience.`,
            `Hard rules: do not mirror JD phrases; remove keyword stuffing; tools never lead bullets; preserve truth.`,
            getLanguageGuardrail(),
            allPreserve.length > 0 ? `Preserve these confirmed skills — never remove them entirely (for frequency violations, prefer removing duplicates from EXPERIENCE, keeping one in SKILLS): ${allPreserve.join(', ')}.` : '',
            removals.length > 0 ? `Remove or rewrite these unsupported/high-risk terms (use experience-based phrasing): ${removals.join(', ')}.` : '',
            replacementHints.length > 0 ? `Preferred replacements: ${replacementHints.join('; ')}.` : '',
            freqKeywords.length > 0 ? `Reduce repetition to meet caps for: ${freqKeywords.join(', ')}.` : '',
            needMirror.length > 0 ? `Rewrite any sentence that copies the JD phrasing. Keep meaning, change wording.` : '',
            `Return ONLY the resume. Keep headings as: ## SUMMARY, ## EXPERIENCE, ## SKILLS, ## EDUCATION.`
        ].filter(Boolean).join('\n');
    };

    const runComplianceAndAutofix = async (markdown: string, preserveList: string[] = []) => {
        let current = markdown;
        let targetKeywords = buildTargetKeywordsForCompliance(localResumeText, jobDescription, analysis.missingKeywords || [], current);
        let report = validateResumeMarkdown({
            markdown: current,
            jobDescription,
            originalResumeText: localResumeText,
            targetKeywords,
            removeRiskyKeywords
        });

        for (let i = 0; i < 1; i += 1) {
            const hard = report.issues.filter(x => x.severity === 'hard');
            if (hard.length === 0) break;
            const prompt = buildAutofixInstruction(report, preserveList);
            const rewritten = await refineAtsResumeContent(current, prompt, jobDescription, localResumeText);
            current = normalizeAtsResumeMarkdown(rewritten);
            targetKeywords = buildTargetKeywordsForCompliance(localResumeText, jobDescription, analysis.missingKeywords || [], current);
            report = validateResumeMarkdown({
                markdown: current,
                jobDescription,
                originalResumeText: localResumeText,
                targetKeywords,
                removeRiskyKeywords
            });
        }

        setComplianceReports(prev => ({ ...prev, [GeneratorType.ATS_RESUME]: report }));
        return { markdown: current, report };
    };

    const applyKeywordOnce = async (keyword: KeywordJustification) => {
        if (!isPaid) return;
        const currentMarkdown = generatedData[GeneratorType.ATS_RESUME];
        if (!currentMarkdown) return;
        const key = (keyword.keyword || '').trim().toLowerCase();
        if (!key) return;
        if (keywordApplyStatus[key]) return;

        setKeywordApplyStatus(prev => ({ ...prev, [key]: true }));
        try {
            const replacement = keyword.alternative_used ? keyword.alternative_used : '';
            const evidenceHint = keyword.resume_evidence ? `Resume evidence to anchor on: "${keyword.resume_evidence}".` : '';
            const keywordSupportedByResume = includesKeyword(localResumeText, keyword.keyword);
            const instruction = [
                `One-click keyword apply: integrate "${keyword.keyword}" exactly once into the resume ONLY if supported by the ORIGINAL resume.`,
                `Do NOT mirror JD sentences. Do NOT keyword-stuff. Tools never lead bullets.`,
                `If "${keyword.keyword}" is unsupported, DO NOT add it. ${replacement ? `Instead, use this experience-based alternative (once, max): "${replacement}".` : ''}`,
                evidenceHint,
                `Preferred placement: ## SKILLS (single, natural mention). If it truly belongs in EXPERIENCE, integrate into an existing bullet without changing meaning or inventing metrics.`,
                getLanguageGuardrail(),
                `Hard caps still apply. Ensure at least one supported term is applied from this action (keyword or approved alternative). Return ONLY the resume with the same headings.`
            ].filter(Boolean).join('\n');

            const updated = await refineAtsResumeContent(currentMarkdown, instruction, jobDescription, localResumeText);
            let normalized = normalizeAtsResumeMarkdown(updated);
            let compliance = await runComplianceAndAutofix(normalized);
            normalized = compliance.markdown;

            const latest = compliance.report.keyword_justifications.find((k) => (k.keyword || '').trim().toLowerCase() === key);
            const isSatisfied = !!(latest?.used || latest?.alternative_applied);
            if (!isSatisfied) {
                const fallbackTerm = keywordSupportedByResume
                    ? (keyword.keyword || '').trim()
                    : (replacement || '').trim();
                if (fallbackTerm) {
                    const deterministic = ensureKeywordInSkillsSection(normalized, fallbackTerm);
                    if (deterministic !== normalized) {
                        compliance = await runComplianceAndAutofix(deterministic);
                        normalized = compliance.markdown;
                    }
                }
            }

            setGeneratedData(prev => ({ ...prev, [GeneratorType.ATS_RESUME]: normalized }));
            const scoring = calculateDeterministicDualScore(normalized, jobDescription);
            setOptimizedScoring(scoring);
        } finally {
            setKeywordApplyStatus(prev => ({ ...prev, [key]: false }));
        }
    };

    const extractJobMinYears = (jd: string): number | null => {
        const text = (jd || '').replace(/\s+/g, ' ').trim();
        if (!text) return null;
        const patterns = [
            /\bminimum\s+of\s+(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/i,
            /\b(\d{1,2})\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience\b/i,
            /\brequires?\s+(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/i
        ];
        for (const re of patterns) {
            const m = text.match(re);
            if (!m) continue;
            const n = Number(m[1]);
            if (Number.isFinite(n) && n > 0 && n < 50) return n;
        }
        return null;
    };

    /**
     * Clean up AI-generated cover letter content:
     * - Strip any accidental ## / ### markdown headers (replace with bold text)
     * - Ensure consistent blank-line paragraph separation
     */
    const normalizeCoverLetterContent = (content: string): string => {
        const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        let result = content
            // Replace any ## Header or ### Header with just the text (no heading syntax)
            .replace(/^#{2,3}\s+(.+)$/gm, '**$1**')
            // Remove any horizontal rule separators that look wrong in letters
            .replace(/^---+$/gm, '')
            // Replace literal [Date ...] placeholder if AI forgot to fill it in
            .replace(/^\[Date[^\]]*\]/im, today)
            // Remove leftover bracket placeholders
            .replace(/^\[Department or Team[^\]]*\]\n?/im, '')
            // Fix "domain. com" → "domain.com" style spacing
            .replace(/(\w)\.\s+(com|in|co|org|net|io|ai)\b/gi, '$1.$2')
            .trim();

        // Ensure structural paragraph breaks even when AI used only single newlines.
        // CoverLetterBody splits on \n{2,}, so single-newline content renders as one block.
        result = result
            // Ensure blank line BEFORE "Dear ..."
            .replace(/([^\n])\n(Dear\b)/gi, '$1\n\n$2')
            // Ensure blank line AFTER "Dear ..., " salutation line
            .replace(/(^Dear[^\n]+[,.]?)\n([^\n])/mi, '$1\n\n$2')
            // Ensure blank line BEFORE closing valediction
            .replace(/([^\n])\n(Sincerely|Regards|Best regards|Yours truly|Yours sincerely|Thank you|Warm regards|Kind regards|Best,)\b/gi, '$1\n\n$2')
            // Ensure blank line BEFORE bullet lists following prose
            .replace(/([.!?])\n(-\s)/g, '$1\n\n$2')
            // Ensure blank line after bullet list before next prose paragraph
            .replace(/(^- [^\n]+)\n([^-\n])/gm, '$1\n\n$2')
            // Collapse any 3+ newlines created by the above
            .replace(/\n{3,}/g, '\n\n');

        return result;
    };

    /**
     * Returns skills that are CONFIRMED in both the JD and the original resume.
     * Uses the full 500+ skill database (via extractKeywords) instead of a hardcoded list.
     * Also checks variant/abbreviation matches so "ML" in resume matches "Machine Learning" in JD.
     */
    const getMustIncludeSkills = (resumeText: string, jd: string): string[] => {
        const jdSkills = extractKeywords(jd);
        const resumeTextLower = resumeText.toLowerCase();
        const out: string[] = [];
        const seen = new Set<string>();

        // Build a quick abbreviation reverse-map: canonical → [abbr, abbr, ...]
        const abbrevMap = ABBREVIATIONS as Record<string, string>;
        const canonicalToAbbrs: Record<string, string[]> = {};
        for (const [abbr, canonical] of Object.entries(abbrevMap)) {
            const c = canonical.toLowerCase();
            if (!canonicalToAbbrs[c]) canonicalToAbbrs[c] = [];
            canonicalToAbbrs[c].push(abbr.toLowerCase());
        }

        for (const skill of jdSkills) {
            const key = skill.normalized.toLowerCase();
            if (seen.has(key)) continue;

            // Direct match (resume has the full skill name)
            const inResumeDirect = resumeTextLower.includes(key);

            // Original form match (e.g., skill.original differs from normalized)
            const inResumeOriginal = !inResumeDirect &&
                skill.original && resumeTextLower.includes(skill.original.toLowerCase());

            // Reverse-abbreviation: JD extracted "Machine Learning" but resume has "ML"
            const abbrs = canonicalToAbbrs[key] || [];
            const inResumeViaAbbr = !inResumeDirect && !inResumeOriginal &&
                abbrs.some(abbr => resumeTextLower.includes(abbr));

            if (inResumeDirect || inResumeOriginal || inResumeViaAbbr) {
                seen.add(key);
                out.push(skill.normalized);
            }
        }

        // Supplement with fresh extractKeywords on the resume to catch JD-matched skills
        // the analysis may have surfaced via AI (but only if they appear in resume text)
        const resumeSkills = extractKeywords(resumeText);
        const resumeSkillNames = new Set(resumeSkills.map(k => k.normalized.toLowerCase()));
        const jdSkillNames = new Set(jdSkills.map(k => k.normalized.toLowerCase()));
        for (const rs of resumeSkills) {
            const rk = rs.normalized.toLowerCase();
            if (!seen.has(rk) && jdSkillNames.has(rk)) {
                seen.add(rk);
                out.push(rs.normalized);
            }
        }
        // Also check raw resume text for JD skills not caught by DB (plain text match)
        for (const js of jdSkills) {
            const jk = js.normalized.toLowerCase();
            if (!seen.has(jk) && resumeTextLower.includes(jk)) {
                seen.add(jk);
                out.push(js.normalized);
            }
        }

        return out.slice(0, 30);
    };

    /** Extract employer identifiers from ### headers for structural integrity checking */
    /**
     * Returns all ### job entry lines (title portion) from the markdown.
     * Counts TOTAL entries — not unique employers — so merged roles at the same
     * company (e.g. three Target entries collapsed into one) are detected as a drop.
     */
    const extractJobEntries = (markdown: string): string[] =>
        markdown.split('\n')
            .filter(line => /^###\s+/.test(line))
            .map(line => line.replace(/^###\s+/, '').trim().toLowerCase())
            .filter(Boolean);

    /**
     * Structural-integrity-aware refine wrapper (fix C).
     * Rejects any AI output that drops or merges ### job entries vs the previous draft.
     */
    const safeRefineAts = async (
        current: string,
        instruction: string,
        jd: string,
        originalText: string
    ): Promise<string> => {
        const beforeEntries = extractJobEntries(current);
        const result = await refineAtsResumeContent(current, instruction, jd, originalText);
        if (beforeEntries.length > 0) {
            const afterEntries = extractJobEntries(result);
            if (afterEntries.length < beforeEntries.length) {
                console.warn(
                    `[HireSchema] Structural integrity: job entries dropped ${beforeEntries.length} → ${afterEntries.length}, reverting pass`
                );
                return current;
            }
        }
        return result;
    };

    const generateTabContent = async (tab: GeneratorType, force = false) => {
        if (!isPaid || !localResumeText) return;
        if (loadingStates[tab]) return;
        if (!force && generatedData[tab]) return;

        setLoadingStates(prev => ({ ...prev, [tab]: true }));
        setGenerationErrors(prev => ({ ...prev, [tab]: '' }));
        const tabKey = String(tab);
        if (progressTimersRef.current[tabKey]) {
            window.clearInterval(progressTimersRef.current[tabKey]);
            delete progressTimersRef.current[tabKey];
        }
        const phases =
            tab === GeneratorType.ATS_RESUME
                ? [
                    'Mapping JD keywords to evidence...',
                    'Rewriting bullets for impact...',
                    'Building a human summary...',
                    'Running ATS + trust checks...',
                    'Final polish...'
                ]
                : tab === GeneratorType.COVER_LETTER
                    ? ['Drafting cover letter...', 'Tightening story...', 'Finalizing...']
                    : tab === GeneratorType.INTERVIEW_PREP
                        ? ['Generating interview kit...', 'Anchoring answers to evidence...', 'Finalizing...']
                        : tab === GeneratorType.LEARNING_PATH
                            ? ['Analyzing gaps...', 'Building learning path...', 'Finalizing...']
                            : ['Generating...'];
        let phaseIndex = 0;
        setProgressMessages(prev => ({ ...prev, [tabKey]: phases[0] || 'Generating...' }));
        progressTimersRef.current[tabKey] = window.setInterval(() => {
            phaseIndex = Math.min(phases.length - 1, phaseIndex + 1);
            setProgressMessages(prev => ({ ...prev, [tabKey]: phases[phaseIndex] || prev[tabKey] || 'Generating...' }));
        }, 2200);
        try {
            const content = await generateContent(tab, resumeFile, jobDescription, analysis, {
                verifiedProfile: analysis.contactProfile,
                language: appLanguage,
                resumeText: localResumeText,
                impliedJdSkills: tab === GeneratorType.ATS_RESUME
                    ? getImpliedJdSkills(localResumeText, jobDescription)
                    : undefined,
            });
            let normalized = tab === GeneratorType.ATS_RESUME
                ? normalizeAtsResumeMarkdown(content)
                : tab === GeneratorType.COVER_LETTER
                    ? normalizeCoverLetterContent(content)
                    : content;

            // POST-GENERATION FABRICATION GUARD: reject if placeholder literals survived
            if (tab === GeneratorType.ATS_RESUME) {
                const PLACEHOLDER_RE = /\b(Date Range|Degree Name|School Name|Company Name|Job Title)\b/i;
                const originalJobCount = (localResumeText.match(/^(#{3}\s|\n#{3}\s)/gm) || []).length
                    || (localResumeText.match(/\n[A-Z][^•\n]{5,60}\s*[-–—]\s*(19|20)\d{2}/g) || []).length;
                const generatedJobCount = extractJobEntries(normalized).length;
                const hasPlaceholders = PLACEHOLDER_RE.test(normalized);
                const hasCollapsedJobs = originalJobCount > 2 && generatedJobCount <= 1;
                if (hasPlaceholders || hasCollapsedJobs) {
                    console.warn('[HireSchema] Fabrication detected — placeholders:', hasPlaceholders, 'collapsed jobs:', hasCollapsedJobs, '— retrying generation');
                    setProgressMessages(prev => ({ ...prev, [tabKey]: 'Fixing fabrication — retrying...' }));
                    // Retry once with an explicit stricter prompt
                    const retryContent = await generateContent(tab, resumeFile, jobDescription, analysis, {
                        verifiedProfile: analysis.contactProfile,
                        language: appLanguage,
                        resumeText: localResumeText,
                        impliedJdSkills: getImpliedJdSkills(localResumeText, jobDescription),
                    });
                    normalized = normalizeAtsResumeMarkdown(retryContent);
                }
            }

            if (tab === GeneratorType.ATS_RESUME) {
                try {
                    const minYears = extractJobMinYears(jobDescription);
                    const mustIncludeSkills = getMustIncludeSkills(localResumeText, jobDescription);
                    // FIX D: Re-extract keywords fresh from current JD (not stale analysis.missingKeywords)
                    const freshJdKeywords = extractKeywords(jobDescription).map(k => k.normalized);
                    const evidenceBackedMissing = getEvidenceBackedMissingKeywords(localResumeText, freshJdKeywords, 14);
                    // Implied skills: JD requires them but resume doesn't say them explicitly —
                    // however the candidate's roles/skills contextually back them (e.g. Analytics → Excel)
                    const impliedJdSkills = getImpliedJdSkills(localResumeText, jobDescription);
                    const targetTerms = dedupeKeywords([...mustIncludeSkills, ...evidenceBackedMissing]);
                    const keywordRules = `Keyword governor (V3): Tool terms may appear up to 2 times total. All other target terms may appear up to 1 time total. No target term may appear more than once per section. Do not cluster terms. Do not mirror JD phrases.`;
                    // FIX 4: Build preserve list for compliance — these must never be stripped
                    const preserveList = dedupeKeywords([...mustIncludeSkills]);
                    const basePrompt = [
                        keywordRules,
                        getLanguageGuardrail(),
                        mustIncludeSkills.length > 0
                            ? [
                                `MANDATORY SKILL INJECTION (NON-NEGOTIABLE):`,
                                `The following skills are CONFIRMED PRESENT in the candidate's original resume AND required/preferred by the JD.`,
                                `Every single one MUST appear in the final output. Minimum once in ## SKILLS.`,
                                `Where naturally supported by existing experience, also weave them into ## EXPERIENCE bullets or ## SUMMARY.`,
                                `These are NOT optional suggestions — the candidate demonstrably has these skills:`,
                                mustIncludeSkills.join(', '),
                              ].join('\n')
                            : '',
                        evidenceBackedMissing.length > 0
                            ? `JD signals backed by resume evidence (include at least once, preferably in ## SKILLS): ${evidenceBackedMissing.join(', ')}.`
                            : '',
                        impliedJdSkills.length > 0
                            ? [
                                `CONTEXTUALLY IMPLIED SKILLS (## SKILLS section ONLY — do NOT fabricate bullets or claim experience with these):`,
                                `The JD requires these skills. The candidate's roles and existing skills strongly imply proficiency`,
                                `(e.g. a Category Planner doing Market Research and Data Analytics almost certainly uses Excel).`,
                                `Add these to ## SKILLS under the appropriate category. Do NOT add to ## EXPERIENCE bullets.`,
                                impliedJdSkills.join(', '),
                              ].join('\n')
                            : '',
                        targetTerms.length > 0
                            ? `In ## SKILLS, list JD-matched evidence-backed terms FIRST (highest relevance), then secondary tools. Preserve all original skills.`
                            : '',
                        minYears
                            ? `The JD mentions a minimum of ${minYears}+ years of experience. If (and only if) the ORIGINAL resume dates support it, state "${minYears}+ years" in the SUMMARY. Otherwise omit.`
                            : '',
                        `Do not add new claims. Do not change employers/titles/dates. Do not remove any existing skills/tools/technologies from the ORIGINAL resume text. Do not imitate or copy JD sentences. Prefer experience-first bullets (action → scope → impact → evidence → tool optional).`
                    ].filter(Boolean).join('\n');
                    // FIX C: use safeRefineAts to guard employer entries
                    const boosted = await safeRefineAts(normalized, basePrompt, jobDescription, localResumeText);
                    normalized = normalizeAtsResumeMarkdown(boosted);

                    const mustKeepTerms = dedupeKeywords([...mustIncludeSkills, ...evidenceBackedMissing]);
                    if (mustKeepTerms.length > 0) {
                        const stillMissingTerms = mustKeepTerms.filter(s => !includesKeyword(normalized, s));
                        if (stillMissingTerms.length > 0) {
                            const skillPassPrompt = [
                                `Final pass: ensure evidence-backed JD terms already present in the ORIGINAL resume are present in the final output.`,
                                keywordRules,
                                getLanguageGuardrail(),
                                `Missing (present in original resume): ${stillMissingTerms.join(', ')}.`,
                                `Add each missing term exactly once, preferably under ## SKILLS (or existing bullets) without inventing any new claims. Keep formatting clean and ATS-friendly.`,
                                `Return ONLY the resume. Keep headings as: ## SUMMARY, ## EXPERIENCE, ## SKILLS, ## EDUCATION.`
                            ].join('\n');
                            const boosted3 = await safeRefineAts(normalized, skillPassPrompt, jobDescription, localResumeText);
                            normalized = normalizeAtsResumeMarkdown(boosted3);
                        }
                    }

                    // FIX 4: pass preserveList so compliance won't strip evidence-backed keywords
                    let compliance = await runComplianceAndAutofix(normalized, preserveList);
                    normalized = compliance.markdown;
                    const withAlternatives = applyDefaultAlternatives(compliance.report, normalized);
                    if (withAlternatives !== normalized) {
                        compliance = await runComplianceAndAutofix(withAlternatives, preserveList);
                        normalized = compliance.markdown;
                    }

                    const postComplianceMissing = targetTerms.filter((term) => !includesKeyword(normalized, term));
                    if (postComplianceMissing.length > 0) {
                        const recoveryPrompt = [
                            `Recovery pass: restore missing evidence-backed JD terms removed during cleanup.`,
                            keywordRules,
                            getLanguageGuardrail(),
                            `Missing terms to restore once each: ${postComplianceMissing.join(', ')}.`,
                            `Place primarily in ## SKILLS. Do not mirror JD phrases. Do not invent claims.`,
                            `Return ONLY the resume with the same headings.`
                        ].join('\n');
                        const recovered = await safeRefineAts(normalized, recoveryPrompt, jobDescription, localResumeText);
                        normalized = normalizeAtsResumeMarkdown(recovered);
                        compliance = await runComplianceAndAutofix(normalized, preserveList);
                        normalized = compliance.markdown;
                        const withAlternatives2 = applyDefaultAlternatives(compliance.report, normalized);
                        if (withAlternatives2 !== normalized) {
                            compliance = await runComplianceAndAutofix(withAlternatives2, preserveList);
                            normalized = compliance.markdown;
                        }
                    }

                    const bulletCounts = getExperienceBulletCounts(normalized);
                    if (bulletCounts.some((count) => count < 3)) {
                        const roleQualityPrompt = [
                            `Experience structure pass: PRESERVE EVERY EMPLOYER AS A SEPARATE ENTRY.`,
                            `CRITICAL: Each company MUST have its own ### Job Title | Company Name | Date Range | Location header.`,
                            `NEVER merge different employers into one block. NEVER combine multiple company names into one ### header (e.g. "Target / Bewakoof.com" is WRONG — each must be separate).`,
                            `Every experience entry must contain at least 3 bullet descriptions.`,
                            `Use only evidence from ORIGINAL resume. Do not invent claims, skills, dates, employers, titles, or metrics.`,
                            `If a role has fewer than 3 bullets, split existing evidence into concise action-impact bullets without adding new facts.`,
                            `Keep headings exactly: ## SUMMARY, ## EXPERIENCE, ## SKILLS, ## EDUCATION.`,
                            getLanguageGuardrail(),
                            `Return ONLY the resume markdown — one single complete resume, starting with ## SUMMARY.`
                        ].join('\n');
                        // FIX C: safeRefineAts for role quality pass too
                        const upgraded = await safeRefineAts(normalized, roleQualityPrompt, jobDescription, localResumeText);
                        normalized = normalizeAtsResumeMarkdown(upgraded);
                    }
                } catch (err) { console.warn('[HireSchema] bullet/role quality pass error:', err); }
            }

            if (tab === GeneratorType.ATS_RESUME) {
                let best = normalized;
                let bestRelevance = 0;
                // FIX A: use deterministic scoring (same engine as rescan) instead of AI scoring
                let bestScoring: { atsScore: number, recruiterScore: number } | null = null;
                try {
                    bestRelevance = await calculateDeterministicRelevanceScore(best, jobDescription);
                } catch (err) { console.warn('[HireSchema] relevance scoring error:', err); }
                const initialScoring = calculateDeterministicDualScore(best, jobDescription);
                if (initialScoring.atsScore > 0 || initialScoring.recruiterScore > 0) bestScoring = initialScoring;

                try {
                    const recruiterPolishPrompt = [
                        `Recruiter polish pass: improve recruiter trust and readability without reducing ATS alignment.`,
                        `Keep every fact identical to the ORIGINAL resume. Do not add claims, skills, employers, titles, dates, or metrics.`,
                        `Rewrite bullets to be more specific and credible, using action → scope → impact → evidence → tool (optional).`,
                        `Use JD terms only when they match evidence and sound natural. Never copy JD sentences.`,
                        `Reduce repetition, buzzwords, and filler. Prefer concrete outcomes over adjectives.`,
                        `Preserve the required ATS headers and formatting rules already in the draft.`,
                        getLanguageGuardrail(),
                        `Return ONLY the resume markdown.`
                    ].join('\n');
                    // FIX C: structural guard on polish pass
                    const polishedRaw = await safeRefineAts(best, recruiterPolishPrompt, jobDescription, localResumeText);
                    let polished = normalizeAtsResumeMarkdown(polishedRaw);
                    const compliance = await runComplianceAndAutofix(polished);
                    polished = compliance.markdown;

                    const polishedRelevance = await calculateDeterministicRelevanceScore(polished, jobDescription).catch(() => 0);
                    // FIX A: deterministic scoring for accept/reject decision
                    const polishedScoring = calculateDeterministicDualScore(polished, jobDescription);

                    const hasBaseline = bestScoring !== null;
                    const atsOk = !hasBaseline || polishedScoring.atsScore >= (bestScoring!.atsScore ?? 0) - 2;
                    const recruiterOk = !hasBaseline || polishedScoring.recruiterScore >= (bestScoring!.recruiterScore ?? 0) - 3;
                    const relevanceOk = bestRelevance === 0 ? true : polishedRelevance >= bestRelevance - 2;
                    const recruiterBetter = !hasBaseline || polishedScoring.recruiterScore > (bestScoring!.recruiterScore ?? 0);

                    if (recruiterBetter && atsOk && recruiterOk && relevanceOk) {
                        best = polished;
                        bestRelevance = polishedRelevance;
                        bestScoring = polishedScoring;
                    }
                } catch (err) { console.warn('[HireSchema] recruiter polish pass error:', err); }

                normalized = best;

                // ── GUARANTEED KEYWORD BACKFILL (Deterministic, no AI) ──────────────────
                const finalEvidenceBacked = dedupeKeywords([
                    ...getMustIncludeSkills(localResumeText, jobDescription),
                    // FIX D: fresh JD extraction for backfill too
                    ...getEvidenceBackedMissingKeywords(localResumeText, extractKeywords(jobDescription).map(k => k.normalized), 25)
                ]);
                const finalMissing = finalEvidenceBacked.filter((term) => !includesKeyword(normalized, term));
                if (finalMissing.length > 0) {
                    const backfilled = ensureKeywordsInSkillsSection(normalized, finalMissing);
                    if (backfilled !== normalized) {
                        const compliance = await runComplianceAndAutofix(backfilled);
                        normalized = compliance.markdown;
                    }
                }

                // ── SCORE IMPROVEMENT PASS — now uses deterministic scorer (FIX A) ────────
                try {
                    const finalScoring = calculateDeterministicDualScore(normalized, jobDescription);
                    const needsAtsBoost = finalScoring.atsScore < 88;
                    const needsRecruiterBoost = finalScoring.recruiterScore < 82;
                    if (needsAtsBoost || needsRecruiterBoost) {
                        const scoreBoostPrompt = [
                            `Score improvement pass: current ATS score is ${finalScoring.atsScore}/100, recruiter score is ${finalScoring.recruiterScore}/100.`,
                            `Target: ATS ≥ 90, Recruiter ≥ 85.`,
                            needsAtsBoost
                                ? `To improve ATS: ensure all JD-matched skills appear in ## SKILLS in proper categories. Use exact JD terminology where evidence-backed. Improve section structure.`
                                : '',
                            needsRecruiterBoost
                                ? `To improve recruiter score: strengthen bullets with action → scope → impact format. Replace passive language with strong action verbs. Add observable outcomes.`
                                : '',
                            `HARD RULE: Keep ALL existing facts, employers, titles, dates, and metrics EXACTLY as they are. Do not invent anything new.`,
                            `Keyword governor: Tool terms may appear up to 2 times total. All other target terms may appear up to 1 time total. No target term may appear more than once per section. Do not cluster terms. Do not mirror JD phrases.`,
                            getLanguageGuardrail(),
                            `Return ONLY the improved resume with headings: ## SUMMARY, ## EXPERIENCE, ## SKILLS, ## EDUCATION.`
                        ].filter(Boolean).join('\n');
                        // FIX C: structural guard on score boost pass
                        const boostedRaw = await safeRefineAts(normalized, scoreBoostPrompt, jobDescription, localResumeText);
                        const boostedNorm = normalizeAtsResumeMarkdown(boostedRaw);
                        // FIX A: deterministic guard — only accept if scores don't drop
                        const boostedScoring = calculateDeterministicDualScore(boostedNorm, jobDescription);
                        if (
                            boostedScoring.atsScore >= finalScoring.atsScore - 2 &&
                            boostedScoring.recruiterScore >= finalScoring.recruiterScore - 3
                        ) {
                            normalized = boostedNorm;
                            bestScoring = boostedScoring;
                        } else {
                            bestScoring = finalScoring;
                        }
                    } else {
                        bestScoring = finalScoring;
                    }
                } catch (err) { console.warn('[HireSchema] score improvement pass error:', err); }

                if (bestScoring) setOptimizedScoring(bestScoring);
                if (Number.isFinite(bestRelevance) && bestRelevance > 0) setOptimizedRelevanceScore(bestRelevance);
            }

            setGeneratedData(prev => ({ ...prev, [tab]: normalized }));
        } catch (err: any) {
            const message = err?.message || 'Failed to generate content.';
            setGenerationErrors(prev => ({ ...prev, [tab]: message }));
        } finally {
            setLoadingStates(prev => ({ ...prev, [tab]: false }));
            if (progressTimersRef.current[tabKey]) {
                window.clearInterval(progressTimersRef.current[tabKey]);
                delete progressTimersRef.current[tabKey];
            }
            setProgressMessages(prev => {
                const next = { ...prev };
                delete next[tabKey];
                return next;
            });
        }
    };

    useEffect(() => {
        if (!isPaid || !localResumeText) return;
        const resumeError = generationErrors[GeneratorType.ATS_RESUME] || '';
        const resumeMissing = !generatedData[GeneratorType.ATS_RESUME];
        const resumeBusy = !!loadingStates[GeneratorType.ATS_RESUME];
        if (resumeMissing && !resumeBusy && !resumeError && activeTab !== GeneratorType.ATS_RESUME) {
            setActiveTab(GeneratorType.ATS_RESUME);
            return;
        }
        const languageChanged = lastLanguageRef.current !== appLanguage;
        if (languageChanged) {
            lastLanguageRef.current = appLanguage;
            autoKitGeneratedRef.current = false;
            setGeneratedData({});
            setComplianceReports({});
            setOptimizedScoring(null);
            setOptimizedRelevanceScore(null);
        }
        const shouldGenerate = languageChanged || !generatedData[activeTab];
        if (shouldGenerate) {
            generateTabContent(activeTab, true);
        }
    }, [activeTab, isPaid, localResumeText, appLanguage]);

    useEffect(() => {
        if (!isPaid || !localResumeText) return;
        if (autoKitGeneratedRef.current) return;
        if (!generatedData[GeneratorType.ATS_RESUME]) return;
        autoKitGeneratedRef.current = true;
        (async () => {
            await Promise.allSettled([
                generateTabContent(GeneratorType.COVER_LETTER, true),
                generateTabContent(GeneratorType.INTERVIEW_PREP, true),
                generateTabContent(GeneratorType.LEARNING_PATH, true)
            ]);
        })();
    }, [isPaid, localResumeText, generatedData[GeneratorType.ATS_RESUME]]);

    useEffect(() => {
        if (!isPaid) return;
        if (activeTab !== GeneratorType.ATS_RESUME) return;
        const current = generatedData[GeneratorType.ATS_RESUME];
        if (!current) return;
        if (loadingStates[GeneratorType.ATS_RESUME] || isRefining) return;
        const runId = ++complianceRunRef.current;
        runComplianceAndAutofix(current).then(async (res) => {
            if (complianceRunRef.current !== runId) return; // stale run — a newer one started
            let nextMarkdown = res.markdown;
            const withAlternatives = applyDefaultAlternatives(res.report, nextMarkdown);
            if (withAlternatives !== nextMarkdown) {
                const res2 = await runComplianceAndAutofix(withAlternatives);
                if (complianceRunRef.current !== runId) return;
                nextMarkdown = res2.markdown;
            }
            if (nextMarkdown !== current) {
                setGeneratedData(prev => ({ ...prev, [GeneratorType.ATS_RESUME]: nextMarkdown }));
            }
            const scoring = calculateDeterministicDualScore(nextMarkdown, jobDescription);
            if (scoring) setOptimizedScoring(scoring);
            const relevance = await calculateDeterministicRelevanceScore(nextMarkdown, jobDescription).catch(() => 0);
            if (Number.isFinite(relevance) && relevance > 0) setOptimizedRelevanceScore(relevance);
        }).catch((err) => { console.warn('[HireSchema] compliance effect error:', err); });
    }, [removeRiskyKeywords]);



    useEffect(() => {
        if (isEditing) setIsCompare(false);
    }, [isEditing]);

    useEffect(() => {
        setIsCompare(false);
    }, [activeTab]);

    const activeError = generationErrors[activeTab] || '';
    const activeCompliance = complianceReports[GeneratorType.ATS_RESUME] || null;
    const baselineAtsScore = Number.isFinite(analysis.atsScore) ? analysis.atsScore : 0;
    const baselineRecruiterScore = analysis.dualScoring?.recruiter_score ?? analysis.recruiterScore ?? null;
    const baselineRelevanceScore = Number.isFinite(analysis.relevanceScore) ? analysis.relevanceScore : 0;
    const complianceAtsScore = activeCompliance?.scoring.ats_score ?? null;
    const complianceRecruiterScore = activeCompliance?.scoring.recruiter_score ?? null;
    const optimizedAtsScore = optimizedScoring && optimizedScoring.atsScore > 0 ? optimizedScoring.atsScore : null;
    const optimizedRecruiterScore = optimizedScoring && optimizedScoring.recruiterScore > 0 ? optimizedScoring.recruiterScore : null;
    const displayedRelevanceScore = activeTab === GeneratorType.ATS_RESUME
        ? Math.max(baselineRelevanceScore, optimizedRelevanceScore ?? 0)
        : baselineRelevanceScore;
    const displayedScore = activeTab === GeneratorType.ATS_RESUME
        ? (
            optimizedAtsScore
            ?? (complianceAtsScore !== null ? Math.max(complianceAtsScore, baselineAtsScore) : baselineAtsScore)
        )
        : baselineAtsScore;
    const displayedRecruiterScore = activeTab === GeneratorType.ATS_RESUME
        ? (
            optimizedRecruiterScore
            ?? (
                complianceRecruiterScore !== null && baselineRecruiterScore !== null
                    ? Math.max(complianceRecruiterScore, baselineRecruiterScore)
                    : (complianceRecruiterScore ?? baselineRecruiterScore)
            )
        )
        : null;
    const complianceKeywords = activeCompliance?.keyword_justifications || [];
    const appliedKeywords = dedupeKeywords(
        complianceKeywords
            .filter((k) => k.used || k.alternative_applied)
            .map((k) => k.keyword)
    );
    const pendingKeywords = dedupeKeywords(
        complianceKeywords
            .filter((k) => !k.used && !k.alternative_applied)
            .map((k) => k.keyword)
    );

    // --- ACTIONS ---
    const handleRefine = async (customPrompt?: string, label?: string) => {
        const prompt = customPrompt || chatInput;
        console.log('[Editor] handleRefine called with prompt:', prompt);
        console.log('[Editor] Current activeTab:', activeTab);
        console.log('[Editor] Has generatedData for activeTab:', !!generatedData[activeTab]);

        if (!prompt.trim() || !generatedData[activeTab]) {
            console.warn('[Editor] handleRefine aborted: prompt empty or no content to refine');
            return;
        }

        setIsRefining(true);
        setRefineLabel(label || 'Optimizing');
        try {
            console.log('[Editor] Calling refineContent...');
            const guidedPrompt = `${prompt}\n\n${getLanguageGuardrail()}`;
            const newContent = activeTab === GeneratorType.ATS_RESUME
                ? await refineAtsResumeContent(generatedData[activeTab], guidedPrompt, jobDescription, localResumeText)
                : await refineContent(activeTab, generatedData[activeTab], guidedPrompt, jobDescription);
            console.log('[Editor] refineContent success, updating state');
            let normalized = activeTab === GeneratorType.ATS_RESUME ? normalizeAtsResumeMarkdown(newContent) : newContent;
            if (activeTab === GeneratorType.ATS_RESUME) {
                const compliance = await runComplianceAndAutofix(normalized);
                normalized = compliance.markdown;
            }
            setGeneratedData(prev => ({ ...prev, [activeTab]: normalized }));
            setChatInput("");
            if (activeTab === GeneratorType.ATS_RESUME) {
                const scoring = calculateDeterministicDualScore(normalized, jobDescription);
                setOptimizedScoring(scoring);
                const relevance = await calculateDeterministicRelevanceScore(normalized, jobDescription).catch(() => 0);
                if (Number.isFinite(relevance) && relevance > 0) setOptimizedRelevanceScore(relevance);
            }
        } catch (err) {
            console.error('[Editor] handleRefine failed:', err);
        } finally {
            setIsRefining(false);
            setRefineLabel("");
        }
    };

    const handleCopy = () => {
        if (generatedData[activeTab]) {
            const toCopy = activeTab === GeneratorType.ATS_RESUME
                ? buildOptimizedPlainText()
                : generatedData[activeTab];
            navigator.clipboard.writeText(toCopy);
            setShowCopyToast(true);
            setTimeout(() => setShowCopyToast(false), 2000);
        }
    };

    const handlePrint = () => {
        if (!pdfRef.current) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Resume - HireSchema</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; }
                        h1 { color: ${accentColor.value}; border-bottom: 2px solid ${accentColor.value}; }
                        h2 { color: #333; margin-top: 20px; }
                        ul { padding-left: 20px; }
                        li { margin-bottom: 5px; }
                    </style>
                </head>
                <body>${pdfRef.current.innerHTML}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    const handleDownloadPDF = async () => {
        if (!generatedData[activeTab] || !pdfRef.current) return;

        const getHtml2Pdf = async (): Promise<any> => {
            const w = window as any;
            if (typeof w.html2pdf === 'function') return w.html2pdf;
            try {
                const mod: any = await import('html2pdf.js');
                const fn = mod?.default || mod;
                if (typeof fn === 'function') {
                    w.html2pdf = fn;
                    return fn;
                }
            } catch { }
            return null;
        };

        setIsDownloading(true);
        try {
            const html2pdf = await getHtml2Pdf();
            if (!html2pdf) {
                throw new Error('PDF export library unavailable');
            }
            const element = pdfRef.current;
            // Ensure fonts/layout are settled before rasterizing for PDF
            // @ts-ignore
            if (document.fonts?.ready) {
                // @ts-ignore
                await document.fonts.ready;
            }
            // Double rAF to ensure layout is stable
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

            const exportWidth = Math.max(794, element.clientWidth);
            const exportHeight = Math.max(1123, element.scrollHeight);
            const maxCanvasHeight = 30000;
            const preferredScale = 2;
            const minScale = 0.25;
            const safeScale = Math.max(minScale, Math.min(preferredScale, maxCanvasHeight / exportHeight));

            const opt = {
                margin: [18, 10, 20, 10],
                filename: `HireSchema_Optimized_${activeTab.replace(/\s+/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                enableLinks: true,
                html2canvas: {
                    scale: safeScale,
                    useCORS: true,
                    letterRendering: true,
                    scrollX: 0,
                    scrollY: 0,
                    x: 0,
                    y: 0,
                    windowWidth: exportWidth,
                    windowHeight: exportHeight,
                    logging: false,
                    backgroundColor: '#ffffff',
                    onclone: (clonedDoc: Document) => {
                        const clonedContainer = clonedDoc.querySelector('.pdf-export-container') as HTMLElement | null;
                        if (clonedContainer) {
                            clonedContainer.style.position = 'relative';
                            clonedContainer.style.left = '0';
                            clonedContainer.style.top = '0';
                        }
                    }
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
                pagebreak: { mode: ['css', 'legacy'], avoid: ['.pdf-job-header', 'h2', 'h3', 'li', 'blockquote', 'pre'] }
            };

            await html2pdf().set(opt).from(element).save();

            if (onDownloadComplete) {
                onDownloadComplete();
            }
        } catch (err) {
            console.error('PDF Generation Error:', err);
            alert('Unable to generate a PDF right now. Please try again in a moment.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDownloadKitPDF = async () => {
        if (!kitPdfRef.current) return;

        const getHtml2Pdf = async (): Promise<any> => {
            const w = window as any;
            if (typeof w.html2pdf === 'function') return w.html2pdf;
            try {
                const mod: any = await import('html2pdf.js');
                const fn = mod?.default || mod;
                if (typeof fn === 'function') {
                    w.html2pdf = fn;
                    return fn;
                }
            } catch { }
            return null;
        };

        setIsDownloading(true);
        try {
            if (!generatedData[GeneratorType.ATS_RESUME]) await generateTabContent(GeneratorType.ATS_RESUME, true);
            if (!generatedData[GeneratorType.COVER_LETTER]) await generateTabContent(GeneratorType.COVER_LETTER, true);
            if (!generatedData[GeneratorType.INTERVIEW_PREP]) await generateTabContent(GeneratorType.INTERVIEW_PREP, true);
            if (!generatedData[GeneratorType.LEARNING_PATH]) await generateTabContent(GeneratorType.LEARNING_PATH, true);
            await new Promise<void>(resolve => setTimeout(resolve, 0));

            const html2pdf = await getHtml2Pdf();
            if (!html2pdf) {
                throw new Error('PDF export library unavailable');
            }

            // @ts-ignore
            if (document.fonts?.ready) {
                // @ts-ignore
                await document.fonts.ready;
            }
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

            const element = kitPdfRef.current;
            const exportWidth = Math.max(794, element.clientWidth);
            const exportHeight = Math.max(1123, element.scrollHeight);
            const maxCanvasHeight = 30000;
            const preferredScale = 2;
            const minScale = 0.25;
            const safeScale = Math.max(minScale, Math.min(preferredScale, maxCanvasHeight / exportHeight));

            const opt = {
                margin: [18, 10, 20, 10],
                filename: `HireSchema_Kit.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                enableLinks: true,
                html2canvas: {
                    scale: safeScale,
                    useCORS: true,
                    letterRendering: true,
                    scrollX: 0,
                    scrollY: 0,
                    x: 0,
                    y: 0,
                    windowWidth: exportWidth,
                    windowHeight: exportHeight,
                    logging: false,
                    backgroundColor: '#ffffff',
                    onclone: (clonedDoc: Document) => {
                        const clonedContainer = clonedDoc.querySelector('.pdf-kit-root') as HTMLElement | null;
                        if (clonedContainer) {
                            clonedContainer.style.position = 'relative';
                            clonedContainer.style.left = '0';
                            clonedContainer.style.top = '0';
                            clonedContainer.style.opacity = '1';
                        }
                    }
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
                pagebreak: { mode: ['css', 'legacy'], avoid: ['.pdf-job-header', 'h2', 'h3', 'li', 'blockquote', 'pre'] }
            };

            await html2pdf().set(opt).from(element).save();

            if (onDownloadComplete) {
                onDownloadComplete();
            }
        } catch (err) {
            console.error('PDF Generation Error:', err);
            alert('Unable to generate the kit PDF right now. Please try again in a moment.');
        } finally {
            setIsDownloading(false);
        }
    };

    // --- RENDER HELPERS ---
    const markdownText = (node: any): string => {
        if (node == null) return '';
        if (typeof node === 'string' || typeof node === 'number') return String(node);
        if (Array.isArray(node)) return node.map(markdownText).join('');
        if (typeof node === 'object' && 'props' in node) return markdownText((node as any).props?.children);
        return '';
    };

    const normalizeRichText = (raw: string, tab: GeneratorType) => {
        const input = (raw || '').replace(/\r\n/g, '\n');
        const trimmed = input.trim();
        if (!trimmed) return '';

        if (tab === GeneratorType.INTERVIEW_PREP) {
            // Force newlines before headers and horizontal rules to ensure ReactMarkdown renders them correctly
            // We use a more aggressive global replace to ensure no missed cases
            return input
                .replace(/(#{1,6}\s)/g, '\n\n$1')       // Ensure ### starts on a new line
                .replace(/(---\s*)/g, '\n\n$1\n\n')     // Ensure --- has spacing around it
                .replace(/(\*\*(Situation|Task|Action|Result|Takeaway|Evidence|Follow-up|Follow-up Answer|Answer):\*\*)/gi, '\n\n$1')
                .replace(/(^|\n)(Situation|Task|Action|Result|Takeaway|Evidence|Follow-up|Follow-up Answer):/gi, '$1\n$2:')
                .replace(/\n{3,}/g, '\n\n')             // Collapse excessive newlines
                .trim();
        }

        if (tab === GeneratorType.LEARNING_PATH) {
            return input
                .replace(/(#{1,6}\s)/g, '\n\n$1')
                .replace(/(^|\n)\s*([1-4])\.\s+\*\*(Why|Curated Resources|Study Plan|Practice Tasks)/gi, '\n\n#### $3')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        }

        const looksLikeMarkdown =
            /(^|\n)\s*#{1,6}\s+\S+/.test(input) ||
            /(^|\n)\s*([-*+]\s+|\d+\.\s+)\S+/.test(input) ||
            /```/.test(input);

        if (looksLikeMarkdown) return input;

        const lines = input.split('\n').map((line) => line.replace(/\s+$/g, ''));
        const out: string[] = [];
        for (const line of lines) {
            const t = line.trim();
            if (!t) {
                out.push('');
                continue;
            }
            if (/^[•·]\s*/.test(t)) {
                out.push(`- ${t.replace(/^[•·]\s*/, '')}`);
                continue;
            }
            out.push(t);
            out.push('');
        }
        return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    };

    const renderMarkdown = (content: string) => {
        const isCover = activeTab === GeneratorType.COVER_LETTER;
        const isInterview = activeTab === GeneratorType.INTERVIEW_PREP;
        const isGaps = activeTab === GeneratorType.LEARNING_PATH;

        const containerClassName = [
            'prose prose-zinc max-w-none',
            'prose-headings:tracking-tight',
            'prose-p:leading-relaxed',
            'prose-li:leading-relaxed',
            'text-zinc-900'
        ].join(' ');

        const displayContent = normalizeRichText(content, activeTab);

        return (
            <article className={containerClassName}>
                <ReactMarkdown
                    remarkPlugins={isInterview ? [remarkGfm, remarkBreaks] : [remarkGfm]}
                    components={{
                        h1: ({ ...props }) => (
                            <h1
                                className={`tracking-tight mb-6 ${isCover ? 'text-2xl sm:text-3xl font-black text-zinc-900 uppercase' : 'text-4xl font-black'} border-b-2 pb-4`}
                                style={{ borderColor: accentColor.value }}
                                {...props}
                            />
                        ),
                        h2: ({ ...props }) => (
                            <h2
                                className={`${isCover ? 'text-lg sm:text-xl font-bold tracking-tight mt-8 mb-4 text-zinc-800' : 'text-lg font-black tracking-widest mt-12 mb-4'} `}
                                style={!isCover ? { color: accentColor.value } : {}}
                                {...props}
                            />
                        ),
                        h3: ({ ...props }) => (
                            <h3
                                className={
                                    isInterview
                                        ? 'text-base sm:text-lg font-black mt-8 mb-3 text-zinc-900 border border-zinc-200 bg-zinc-50 rounded-sm px-4 py-3'
                                        : isGaps
                                            ? 'text-base sm:text-lg font-black mt-8 mb-3 text-zinc-900 border border-zinc-200 bg-white rounded-sm px-4 py-3'
                                            : `${isCover ? 'text-base font-bold mt-6 mb-3 text-zinc-900' : 'text-base font-bold mt-6 mb-2 text-zinc-900'}`
                                }
                                {...props}
                            />
                        ),
                        h4: ({ ...props }) => (
                            <h4
                                className={
                                    isGaps
                                        ? 'text-[11px] font-black uppercase tracking-widest text-zinc-600 mt-5 mb-2'
                                        : 'text-sm font-bold mt-4 mb-2 text-zinc-800'
                                }
                                {...props}
                            />
                        ),
                        p: ({ ...props }) => {
                            const text = markdownText(props.children).trim();
                            if (isInterview) {
                                const lower = text.toLowerCase();
                                if (lower.startsWith('q:') || lower.startsWith('question:')) {
                                    return (
                                        <div className="mt-5 mb-3 p-4 rounded-sm border border-zinc-200 bg-zinc-50">
                                            <div className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">Question</div>
                                            <p className="text-sm sm:text-base font-semibold leading-relaxed text-zinc-900" {...props} />
                                        </div>
                                    );
                                }
                                if (lower.startsWith('a:') || lower.startsWith('answer:')) {
                                    return (
                                        <div className="mb-4 p-4 rounded-sm border border-zinc-200 bg-white">
                                            <div className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">Answer</div>
                                            <p className="text-sm sm:text-base leading-relaxed text-zinc-800" {...props} />
                                        </div>
                                    );
                                }
                                const normalized = text.replace(/\*\*/g, '').trim();
                                const starMatch = normalized.match(/^(situation|task|action|result|takeaway|evidence|follow-up|follow-up answer|why this works)\s*:/i);
                                if (starMatch) {
                                    const label = starMatch[1];
                                    return (
                                        <div className="mb-2.5 rounded-sm border border-zinc-200 bg-white p-3.5">
                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
                                                {label}
                                            </div>
                                            <p className="text-sm sm:text-base leading-relaxed text-zinc-800" {...props} />
                                        </div>
                                    );
                                }
                            }
                            return (
                                <p
                                    className={`${isCover ? 'text-base sm:text-[15px] leading-7 text-zinc-800 mb-6 font-medium' : 'text-sm sm:text-base leading-relaxed text-zinc-800 mb-4'}`}
                                    {...props}
                                />
                            );
                        },
                        ul: ({ ...props }) => (
                            <ul className={`${isCover ? 'my-6 pl-5 list-disc space-y-2 marker:text-zinc-400' : 'space-y-3 my-6'}`} {...props} />
                        ),
                        ol: ({ ...props }) => (
                            <ol className={`${isCover ? 'my-6 pl-5 list-decimal space-y-2 marker:text-zinc-500' : 'my-6 pl-6 list-decimal space-y-3'}`} {...props} />
                        ),
                        li: ({ ...props }) => {
                            if (isCover) return <li className="text-base sm:text-[15px] leading-7 text-zinc-800 pl-1" {...props} />;
                            if (isGaps) return <li className="text-sm sm:text-base text-zinc-800 leading-relaxed" {...props} />;
                            return (
                                <li className="flex items-start gap-3 text-sm sm:text-base text-zinc-800">
                                    <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor.value }} />
                                    <span>{props.children}</span>
                                </li>
                            );
                        },
                        blockquote: ({ ...props }) => (
                            <blockquote
                                className="my-8 pl-6 border-l-4 text-zinc-600 italic text-lg leading-relaxed bg-zinc-50 py-4 pr-4 rounded-r-lg"
                                style={{ borderColor: accentColor.value }}
                                {...props}
                            />
                        ),
                        a: ({ ...props }) => (
                            <a className="text-orange-600 underline underline-offset-2 hover:text-orange-500" target="_blank" rel="noopener noreferrer" {...props} />
                        ),
                        hr: ({ ...props }) => <hr className="my-8 border-zinc-200" {...props} />,
                        code: ({ inline, className, children, ...props }: any) => {
                            if (inline) {
                                return (
                                    <code className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-900 font-mono text-[0.85em]" {...props}>
                                        {children}
                                    </code>
                                );
                            }
                            return (
                                <code className={`block font-mono text-xs sm:text-sm text-zinc-100 ${className || ''}`} {...props}>
                                    {children}
                                </code>
                            );
                        },
                        pre: ({ ...props }) => (
                            <pre className="my-6 p-4 rounded-xl bg-zinc-950 overflow-x-auto border border-zinc-800" {...props} />
                        ),
                        table: ({ ...props }) => (
                            <div className="my-6 overflow-x-auto border border-zinc-200 rounded-xl">
                                <table className="min-w-full text-sm" {...props} />
                            </div>
                        ),
                        thead: ({ ...props }) => <thead className="bg-zinc-50" {...props} />,
                        th: ({ ...props }) => <th className="text-left px-3 py-2 font-black text-xs uppercase tracking-widest text-zinc-600 border-b border-zinc-200" {...props} />,
                        td: ({ ...props }) => <td className="px-3 py-2 text-zinc-800 border-b border-zinc-100 align-top" {...props} />,
                        input: ({ ...props }) => (
                            <input
                                {...props}
                                className="mr-2 accent-orange-600"
                                type="checkbox"
                                disabled
                            />
                        ),
                        strong: ({ ...props }) => <strong className="font-bold text-black" {...props} />
                    }}
                >
                    {displayContent}
                </ReactMarkdown>
            </article>
        );
    };

    return (
        <div className="flex flex-col h-full bg-black text-white font-sans overflow-hidden" >

            {/* --- TOP BAR --- */}
            < div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-zinc-950/50 backdrop-blur-xl shrink-0" >
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Workspace</span>
                    </div>

                    <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-white/5">
                        {(() => {
                            const resumeLocked = isPaid && loadingStates[GeneratorType.ATS_RESUME] && !generatedData[GeneratorType.ATS_RESUME];
                            return [
                                { id: GeneratorType.ATS_RESUME, label: 'Resume', icon: FileText },
                                { id: GeneratorType.COVER_LETTER, label: 'Cover', icon: Mail },
                                { id: GeneratorType.INTERVIEW_PREP, label: 'Interview', icon: MessageSquare },
                                { id: GeneratorType.LEARNING_PATH, label: 'Gaps', icon: GraduationCap },
                            ].map(tab => {
                                const disabled = resumeLocked && tab.id !== GeneratorType.ATS_RESUME;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            if (disabled) return;
                                            setActiveTab(tab.id);
                                        }}
                                        disabled={disabled}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-zinc-800 text-white shadow-lg' : disabled ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        <tab.icon className={`w-3 h-3 ${activeTab === tab.id ? 'text-orange-500' : ''}`} />
                                        {tab.label}
                                    </button>
                                );
                            });
                        })()}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-white/5 rounded-full">
                        <span className="text-xs font-black text-orange-500 uppercase tracking-widest">Interview Ready</span>
                    </div>

                    <div className="h-5 w-px bg-white/10" />

                    <div className="flex gap-1.5">
                        <button
                            onClick={() => generateTabContent(activeTab, true)}
                            disabled={!isPaid || !localResumeText || loadingStates[activeTab]}
                            className="p-1.5 text-zinc-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Refresh / Regenerate"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => generateTabContent(activeTab, true)}
                            disabled={!isPaid || !localResumeText || loadingStates[activeTab]}
                            className="p-1.5 text-zinc-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Enhance / Magic"
                        >
                            <Wand2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={handlePrint} className="p-1.5 text-zinc-500 hover:text-white transition-colors" title="Print"><Printer className="w-3.5 h-3.5" /></button>
                        <button onClick={handleCopy} className="p-1.5 text-zinc-500 hover:text-white transition-colors" title="Copy"><Copy className="w-3.5 h-3.5" /></button>
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isDownloading}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest rounded-sm transition-all disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Download className="w-2.5 h-2.5" />}
                            PDF
                        </button>
                        <button
                            onClick={handleDownloadKitPDF}
                            disabled={isDownloading}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-white hover:bg-zinc-50 active:bg-zinc-200 text-black font-black text-xs uppercase tracking-widest rounded-sm transition-all disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Download className="w-2.5 h-2.5" />}
                            Kit
                        </button>
                    </div>
                </div>
            </div >

            <div className="flex-1 flex overflow-hidden">
                {/* --- MAIN PREVIEW AREA --- */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-black relative">
                    <div className={`${activeTab === GeneratorType.ATS_RESUME ? 'max-w-[900px]' : 'max-w-[700px]'} mx-auto`}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab + (loadingStates[activeTab] ? 'loading' : 'content')}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className={`relative overflow-hidden ${
                                    activeTab === GeneratorType.ATS_RESUME && !loadingStates[activeTab] && !isEditing && !isCompare && !!generatedData[activeTab]
                                        ? 'bg-transparent border-0 p-0 shadow-none min-h-[1123px]'
                                        : (loadingStates[activeTab] && !generatedData[activeTab])
                                            ? 'bg-gradient-to-b from-zinc-950 to-black border border-white/10 p-6 sm:p-12 rounded-sm shadow-2xl min-h-[900px] flex items-center justify-center'
                                            : 'bg-white border border-zinc-200 p-6 sm:p-12 rounded-sm shadow-2xl min-h-[900px]'
                                }`}
                            >
                                {isEditing ? (
                                    activeTab === GeneratorType.COVER_LETTER ? (
                                        <CoverLetterEditor
                                            initialContent={generatedData[activeTab] || ''}
                                            onChange={(val) => setGeneratedData(prev => ({ ...prev, [activeTab]: val }))}
                                        />
                                    ) : (
                                        <textarea
                                            value={generatedData[activeTab] || ''}
                                            onChange={(e) => setGeneratedData(prev => ({ ...prev, [activeTab]: e.target.value }))}
                                            className="w-full h-[700px] bg-transparent text-zinc-800 font-mono text-sm resize-none focus:outline-none"
                                        />
                                    )
                                ) : (
                                    <>
                                        {isCompare ? (
                                            renderCompareView()
                                        ) : (
                                            <>
                                                {(loadingStates[activeTab] || isRefining) && (
                                                    <div className={`${generatedData[activeTab] ? 'mb-6' : ''} w-full flex items-center justify-center`}>
                                                        <LoadingIndicator
                                                            message={
                                                                isRefining
                                                                    ? (refineLabel || 'Optimizing...')
                                                                    : (progressMessages[String(activeTab)] || 'Generating...')
                                                            }
                                                            size="md"
                                                        />
                                                    </div>
                                                )}

                                                {activeError && !generatedData[activeTab] ? (
                                                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-900">
                                                        <div className="text-xs font-black uppercase tracking-widest mb-2">Generation Failed</div>
                                                        <div className="text-sm font-medium leading-relaxed">{activeError}</div>
                                                        <button
                                                            onClick={() => generateTabContent(activeTab, true)}
                                                            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-sm transition-all"
                                                        >
                                                            <Wand2 className="w-3 h-3" />
                                                            Try Again
                                                        </button>
                                                    </div>
                                                ) : !generatedData[activeTab] ? (
                                                    <div className="h-[260px]" />
                                                ) : (
                                                    activeTab === GeneratorType.ATS_RESUME || activeTab === GeneratorType.COVER_LETTER ? (
                                                        <PdfTemplate
                                                            ref={previewPdfRef}
                                                            mode="preview"
                                                            content={generatedData[activeTab] || ''}
                                                            themeColor={accentColor.value}
                                                            profile={analysis.contactProfile}
                                                            showContactHeader
                                                            type={activeTab === GeneratorType.COVER_LETTER ? 'cover_letter' : 'resume'}
                                                        />
                                                    ) : (
                                                        renderMarkdown(generatedData[activeTab] || '')
                                                    )
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <PdfTemplate
                        ref={pdfRef}
                        mode="export"
                        content={generatedData[activeTab] || ''}
                        themeColor={accentColor.value}
                        profile={analysis.contactProfile}
                        showContactHeader={activeTab === GeneratorType.ATS_RESUME || activeTab === GeneratorType.COVER_LETTER}
                        type={
                            activeTab === GeneratorType.ATS_RESUME ? 'resume' :
                                activeTab === GeneratorType.COVER_LETTER ? 'cover_letter' :
                                    activeTab === GeneratorType.INTERVIEW_PREP ? 'interview' : 'general'
                        }
                    />

                    <div
                        ref={kitPdfRef}
                        className="pdf-kit-root"
                        aria-hidden="true"
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            opacity: 0,
                            pointerEvents: 'none',
                            userSelect: 'none',
                            zIndex: -100,
                            width: '210mm'
                        }}
                    >
                        <div style={{ pageBreakAfter: 'always' as any }}>
                            <PdfTemplate
                                mode="preview"
                                content={generatedData[GeneratorType.ATS_RESUME] || ''}
                                themeColor={accentColor.value}
                                profile={analysis.contactProfile}
                                showContactHeader
                                type="resume"
                            />
                        </div>
                        <div style={{ pageBreakAfter: 'always' as any }}>
                            <PdfTemplate
                                mode="preview"
                                content={generatedData[GeneratorType.COVER_LETTER] || ''}
                                themeColor={accentColor.value}
                                profile={analysis.contactProfile}
                                showContactHeader
                                type="cover_letter"
                            />
                        </div>
                        <div style={{ pageBreakAfter: 'always' as any }}>
                            <PdfTemplate
                                mode="preview"
                                content={generatedData[GeneratorType.INTERVIEW_PREP] || ''}
                                themeColor={accentColor.value}
                                profile={analysis.contactProfile}
                                showContactHeader={false}
                                type="interview"
                            />
                        </div>
                        <div style={{ pageBreakAfter: 'always' as any }}>
                            <PdfTemplate
                                mode="preview"
                                content={generatedData[GeneratorType.LEARNING_PATH] || ''}
                                themeColor={accentColor.value}
                                profile={analysis.contactProfile}
                                showContactHeader={false}
                                type="general"
                            />
                        </div>
                    </div>
                </div>

                {/* --- RIGHT CONTROL PANEL --- */}
                <div className="w-[260px] border-l border-white/5 bg-zinc-950 flex flex-col shrink-0">
                    <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-2.5">
                            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Insights</h3>
                        </div>

                        <div className="space-y-2 mb-5">
                            {activeTab === GeneratorType.ATS_RESUME && activeCompliance && (
                                <div className="p-2.5 bg-white/5 border border-white/10 rounded-lg">
                                    <div className="flex justify-between items-center mb-2.5">
                                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                    Optimization Status
                                </div>
                            </div>
                            <div className="bg-zinc-950/70 border border-white/10 rounded-md p-2 text-center">
                                    <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Result</div>
                                    <div className="text-lg font-black text-white leading-none">Interview Ready</div>
                            </div>
                                    <label className="mt-2.5 flex items-center gap-2 text-xs text-zinc-300 font-bold">
                                        <input
                                            type="checkbox"
                                            checked={removeRiskyKeywords}
                                            onChange={(e) => setRemoveRiskyKeywords(e.target.checked)}
                                            className="accent-orange-600"
                                        />
                                        Remove risky / over-optimized keywords
                                    </label>
                                    <button
                                        onClick={() => setIsComplianceOpen(true)}
                                        className="mt-2.5 w-full py-2 rounded-md bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <Wand2 className="w-3 h-3" />
                                        Fix Keywords &amp; Issues
                                        {activeCompliance.issues.length > 0 && (
                                            <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[9px] font-black">{activeCompliance.issues.length}</span>
                                        )}
                                    </button>
                                </div>
                            )}
                            <div className="p-2.5 bg-orange-500/5 border border-orange-500/10 rounded-lg">
                                <div className="text-xs font-black text-orange-500 uppercase tracking-widest mb-1.5">ATS Keywords Applied</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {appliedKeywords.length > 0 ? (
                                        appliedKeywords.map((keyword, idx) => (
                                            <span key={idx} className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-xs font-bold">
                                                {keyword}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-sm text-zinc-500 leading-tight">No keywords applied yet.</p>
                                    )}
                                </div>
                                {pendingKeywords.length > 0 && (
                                    <div className="mt-2">
                                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Missing — tap to apply</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {pendingKeywords.slice(0, 10).map((keyword, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setIsComplianceOpen(true)}
                                                    className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded text-xs font-bold hover:bg-orange-500/20 transition-colors cursor-pointer"
                                                    title="Open diagnostics to apply this keyword"
                                                >
                                                    {keyword}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setIsComplianceOpen(true)}
                                            className="mt-2 w-full py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest transition-colors"
                                        >
                                            Apply missing keywords →
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* --- ASSISTANT — always visible, never scrolls away --- */}
                    <div className="p-3 border-t border-white/10 bg-zinc-900/60">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">Ask Assistant</h3>
                            {isRefining && <span className="text-[10px] text-orange-400 font-bold animate-pulse">{refineLabel || 'Thinking…'}</span>}
                        </div>
                        <div className="relative">
                            <textarea
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && chatInput.trim()) {
                                        e.preventDefault();
                                        handleRefine(undefined, 'Custom');
                                    }
                                }}
                                placeholder="e.g. Make bullets more concise…"
                                className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2.5 pr-9 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 resize-none h-[72px] transition-all"
                            />
                            <button
                                onClick={() => handleRefine(undefined, 'Custom')}
                                disabled={isRefining || !chatInput.trim()}
                                className="absolute bottom-2 right-2 p-1.5 bg-orange-600 rounded-md text-white hover:bg-orange-500 disabled:opacity-40 transition-all"
                                title="Send (⌘ Enter)"
                            >
                                {isRefining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            </button>
                        </div>
                        <div className="mt-1 text-[10px] text-zinc-600 font-medium text-right">⌘ Enter to send</div>
                    </div>

                    <div className="p-3 border-t border-white/5 bg-zinc-950/80 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-2.5">
                            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Language</span>
                            <button
                                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                className="flex items-center gap-1 text-xs font-black text-white uppercase tracking-widest hover:text-zinc-200 transition-colors"
                            >
                                {appLanguage} <ChevronDown className="w-2 h-2" />
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className={`flex-1 py-2 rounded-sm border font-black text-xs uppercase tracking-widest transition-all ${isEditing ? 'bg-orange-600 border-orange-700 text-white' : 'bg-transparent border-white/20 text-white hover:bg-white/5'}`}
                            >
                                {isEditing ? 'Save' : 'Manual Edit'}
                            </button>
                            <button
                                onClick={() => setIsCompare(!isCompare)}
                                disabled={isEditing || !generatedData[activeTab] || loadingStates[activeTab]}
                                className={`flex-1 py-2 rounded-sm border font-black text-xs uppercase tracking-widest transition-all ${isCompare ? 'bg-white/10 border-white/30 text-white' : 'bg-transparent border-white/20 text-white hover:bg-white/5'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                Compare
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Language Selection Overlay */}
            <AnimatePresence>
                {isLangMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsLangMenuOpen(false)}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-zinc-900 border border-white/10 p-8 rounded-2xl max-w-md w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-black text-white uppercase tracking-widest mb-6 text-center">Select Language</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {LANGUAGES.map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => { setAppLanguage(lang); setIsLangMenuOpen(false); }}
                                        className={`p-4 rounded-2xl border transition-all text-xs font-black uppercase tracking-widest ${appLanguage === lang ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-zinc-950 border-white/5 text-zinc-500 hover:border-white/20'}`}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Copy Toast */}
            <AnimatePresence>
                {showCopyToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-orange-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-2xl flex items-center gap-3"
                    >
                        <Check className="w-4 h-4" />
                        Copied to Clipboard
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isComplianceOpen && activeCompliance && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsComplianceOpen(false)}
                        className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden"
                        >
                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Diagnostics</div>
                                    <div className="text-lg font-black text-white">Keyword &amp; Score Analysis</div>
                                    <div className="text-xs text-zinc-400 font-medium mt-0.5">Click <span className="text-orange-400 font-bold">Apply</span> on any missing keyword below to inject it into your resume</div>
                                </div>
                                <button
                                    onClick={() => setIsComplianceOpen(false)}
                                    className="p-2 text-zinc-400 hover:text-white transition-colors"
                                    title="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-4 overflow-y-auto custom-scrollbar max-h-[calc(80vh-64px)]">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">ATS Score</div>
                                        <div className="text-3xl font-black text-white mt-2">{activeCompliance.scoring.ats_score}</div>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Recruiter Score</div>
                                        <div className="text-3xl font-black text-white mt-2">{activeCompliance.scoring.recruiter_score}</div>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Verdict</div>
                                        <div className="text-sm font-black text-white mt-2">{activeCompliance.scoring.verdict}</div>
                                        <div className="text-xs text-zinc-400 font-medium mt-1 leading-relaxed">{activeCompliance.scoring.summary}</div>
                                    </div>
                                </div>

                                <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3">
                                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Validator Output</div>
                                    <div className="space-y-2">
                                        {activeCompliance.issues.length === 0 ? (
                                            <div className="text-sm text-zinc-400 font-medium">No issues detected.</div>
                                        ) : (
                                            activeCompliance.issues.map((i, idx) => (
                                                <div key={idx} className="flex items-start justify-between gap-3 bg-zinc-950/60 border border-white/10 rounded-lg p-2.5">
                                                    <div>
                                                        <div className={`text-[10px] font-black uppercase tracking-widest ${i.severity === 'hard' ? 'text-red-400' : 'text-orange-400'}`}>
                                                            {i.severity === 'hard' ? 'Hard Fail' : 'Soft Flag'} • {i.validator}
                                                        </div>
                                                        <div className="text-sm text-white font-medium mt-1 leading-snug">{i.message}</div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3">
                                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Keyword Justification Log</div>
                                    <div className="space-y-2">
                                        {activeCompliance.keyword_justifications.map((k, idx) => (
                                            <div key={idx} className="bg-zinc-950/60 border border-white/10 rounded-lg p-3">
                                                {(() => {
                                                    const applyKey = (k.keyword || '').trim().toLowerCase();
                                                    const isApplying = !!keywordApplyStatus[applyKey];
                                                    const isSatisfied = !!(k.used || k.alternative_applied);
                                                    const canApply = !isSatisfied && !!generatedData[GeneratorType.ATS_RESUME] && !isApplying;
                                                    return (
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <button
                                                                    onClick={() => canApply && applyKeywordOnce(k)}
                                                                    disabled={!canApply}
                                                                    className={`text-sm font-black text-left ${canApply ? 'text-white hover:underline' : 'text-white'
                                                                        } disabled:opacity-80 disabled:cursor-default`}
                                                                    title={canApply ? 'Apply once' : undefined}
                                                                >
                                                                    {k.keyword}
                                                                </button>
                                                                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-0.5">
                                                                    {k.category} • Risk: {k.risk_level} • Freq: {k.frequency}/{k.allowed_frequency}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${k.used
                                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                                        : k.alternative_applied
                                                                            ? 'bg-orange-500/10 border-orange-500/20 text-orange-300'
                                                                            : 'bg-zinc-800/40 border-white/10 text-zinc-300'
                                                                    }`}>
                                                                    {k.used ? 'Used' : k.alternative_applied ? 'Alt Used' : 'Not Used'}
                                                                </div>
                                                                {!isSatisfied && (
                                                                    <button
                                                                        onClick={() => applyKeywordOnce(k)}
                                                                        disabled={!generatedData[GeneratorType.ATS_RESUME] || isApplying}
                                                                        className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:opacity-60 text-white text-[10px] font-black uppercase tracking-widest rounded-full transition-all flex items-center gap-1.5"
                                                                        title="Apply once"
                                                                    >
                                                                        {isApplying ? (
                                                                            <>
                                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                                Applying
                                                                            </>
                                                                        ) : (
                                                                            'Apply'
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                                {(k.used || k.alternative_applied) ? (
                                                    <>
                                                        {!k.used && k.alternative_applied && k.alternative_used && (
                                                            <div className="text-xs text-orange-300 font-medium mt-2 leading-relaxed">
                                                                Applied alternative: {k.alternative_used}
                                                            </div>
                                                        )}
                                                        {k.resume_evidence && <div className="text-xs text-zinc-300 font-medium mt-2 leading-relaxed">Evidence: {k.resume_evidence}</div>}
                                                        {k.job_description_reference && <div className="text-xs text-zinc-500 font-medium mt-1 leading-relaxed">JD: {k.job_description_reference}</div>}
                                                        {k.justification && <div className="text-xs text-zinc-400 font-medium mt-2 leading-relaxed">{k.justification}</div>}
                                                    </>
                                                ) : (
                                                    <div className="text-xs text-zinc-400 font-medium mt-2 leading-relaxed">
                                                        {k.reason || 'Not used.'}{k.alternative_used ? ` Alternative: ${k.alternative_used}` : ''}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-white/10 flex items-center justify-between gap-3">
                                <div className="text-xs text-zinc-500 font-medium">
                                    {pendingKeywords.length > 0
                                        ? `${pendingKeywords.length} keyword${pendingKeywords.length > 1 ? 's' : ''} still missing — apply above to improve your score`
                                        : 'All keywords applied. Your resume is fully optimized.'}
                                </div>
                                <button
                                    onClick={() => setIsComplianceOpen(false)}
                                    className="shrink-0 px-4 py-2 rounded-md bg-orange-600 hover:bg-orange-500 text-white text-xs font-black uppercase tracking-widest transition-colors"
                                >
                                    Back to Editor
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default Editor;
