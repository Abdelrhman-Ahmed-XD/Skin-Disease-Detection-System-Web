import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { TrendingUp, ShieldCheck, Activity, Layers, Download, FileText, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#00e5ff', '#0ea5e9', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#f97316'];

interface ScanResult {
    disease?: string;
    confidence?: number;
    segmentedUrl?: string;
    description?: string;
    tips?: string[];
    precautions?: string[];
    sources?: string[];
}

interface Scan {
    id: string;
    photoUri?: string;
    imageUrl?: string;
    createdAt?: any;
    timestamp?: any;
    bodyView?: string;
    source?: string;

    // Nested structure
    result?: ScanResult;

    // Legacy fields
    analysis?: string;
    disease?: string;
    confidence?: number;
    description?: string;
    segmentedUrl?: string;
    tips?: string[];
    precautions?: string[];
    sources?: string[];
}

const formatDate = (v: any): string => {
    if (!v) return 'Unknown date';
    try {
        if (typeof v?.toDate === 'function') return v.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return new Date(v).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return 'Unknown date'; }
};

const toMs = (v: any): number => {
    if (!v) return 0;
    if (typeof v?.toDate === 'function') return v.toDate().getTime();
    const d = new Date(v);
    return isNaN(d.getTime()) ? 0 : d.getTime();
};

const isWeb = (source?: string): boolean => {
    if (!source) return true;
    return source.toLowerCase().includes('web');
};

// ── Convert image URL to base64 for embedding in PDF ──────────────────────
const urlToBase64 = async (url: string): Promise<string> => {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch { return ''; }
};

// 🔥 COMPLETELY REWRITTEN CSS: Strictly scoped to prevent any React layout glitching
const CSS = `
  .pdf-container { font-family: Georgia, 'Times New Roman', serif; background: #D8E9F0; width: 100%; text-align: left; }
  .pdf-container * { box-sizing: border-box; margin: 0; padding: 0; }
  .pdf-container .page { margin: 0 auto; background: #D8E9F0; overflow: hidden; page-break-after: always; }
  .pdf-container .page.single { width: 700px; }
  .pdf-container .page.summary { width: 960px; }
  .pdf-container .page:last-child { page-break-after: auto; }
  .pdf-container .header { background: #004F7F; padding: 32px 24px 24px; text-align: center; }
  .pdf-container .brand { font-size: 42px; font-weight: bold; color: #fff; letter-spacing: 2px; }
  .pdf-container .brand-s { color: #00A3A3; font-size: 50px; }
  .pdf-container .tagline { color: #C5E3ED; font-size: 12px; margin-top: 4px; letter-spacing: 3px; font-style: italic; }
  .pdf-container .divider { width: 50px; height: 3px; background: #00A3A3; margin: 12px auto 0; border-radius: 10px; }
  .pdf-container .banner { background: #00A3A3; padding: 8px 20px; text-align: center; }
  .pdf-container .banner p { color: #fff; font-size: 13px; font-style: italic; }
  
  .pdf-container .report-bar { background: #fff; border-left: 1px solid #C5E3ED; border-right: 1px solid #C5E3ED; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
  .pdf-container .report-num { font-size: 20px; font-weight: bold; color: #004F7F; }
  .pdf-container .report-date { font-size: 12px; color: #6B7280; font-family: system-ui, sans-serif; }
  
  .pdf-container .patient-section { background: #fff; border-left: 1px solid #C5E3ED; border-right: 1px solid #C5E3ED; padding: 16px 24px; border-top: 1px solid #E5F0F6; }
  .pdf-container .section-title { font-size: 13px; font-weight: bold; color: #004F7F; margin-bottom: 12px; font-family: system-ui, sans-serif; text-transform: uppercase; letter-spacing: .5px; }
  .pdf-container .patient-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .pdf-container .patient-grid.wide { grid-template-columns: repeat(6, 1fr); }
  .pdf-container .info-item { background: #F4FBFF; border-radius: 8px; padding: 10px 12px; border: 1px solid #C5E3ED; }
  .pdf-container .info-label { font-size: 10px; color: #9CA3AF; font-family: system-ui, sans-serif; margin-bottom: 3px; text-transform: uppercase; letter-spacing: .5px; }
  .pdf-container .info-value { font-size: 13px; font-weight: bold; color: #1F2937; font-family: system-ui, sans-serif; }
  
  .pdf-container .image-section { background: #fff; border-left: 1px solid #C5E3ED; border-right: 1px solid #C5E3ED; padding: 0 24px 20px; display: flex; justify-content: center; gap: 20px; align-items: center; }
  .pdf-container .image-wrapper { text-align: center; flex: 1; }
  .pdf-container .image-wrapper img { width: 100%; max-height: 250px; border-radius: 12px; border: 3px solid #C5E3ED; object-fit: cover; }
  .pdf-container .mask-wrapper { text-align: center; flex: 1; }
  .pdf-container .mask-wrapper img { width: 100%; max-height: 250px; border-radius: 12px; border: 3px solid #00A3A3; background: #060c10; object-fit: contain; }
  .pdf-container .img-label { font-size: 10px; color: #9CA3AF; font-family: system-ui, sans-serif; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .5px; font-weight: bold; }

  .pdf-container .analysis-section { background: #fff; border-left: 1px solid #C5E3ED; border-right: 1px solid #C5E3ED; padding: 16px 24px; }
  .pdf-container .condition-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .pdf-container .condition-name { font-size: 20px; font-weight: bold; color: #004F7F; font-family: system-ui, sans-serif; }
  .pdf-container .confidence-badge { background: #004F7F; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-family: system-ui, sans-serif; font-weight: bold; }
  .pdf-container .confidence-bar-wrap { height: 8px; background: #E5F0F6; border-radius: 6px; overflow: hidden; margin-bottom: 14px; }
  .pdf-container .confidence-bar { height: 100%; background: linear-gradient(90deg, #004F7F, #00A3A3); border-radius: 6px; }
  
  .pdf-container .description-box { background: #F4FBFF; border-radius: 10px; padding: 14px 16px; border: 1px solid #C5E3ED; margin-bottom: 12px; }
  .pdf-container .description-label { font-size: 10px; color: #9CA3AF; font-family: system-ui, sans-serif; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .5px; font-weight: bold; }
  .pdf-container .description-text { font-size: 13px; color: #374151; line-height: 1.7; font-family: system-ui, sans-serif; }
  .pdf-container .tips-list { padding-left: 18px; margin-top: 6px; }
  .pdf-container .tips-list li { font-size: 13px; color: #374151; line-height: 1.6; font-family: system-ui, sans-serif; margin-bottom: 6px; }
  .pdf-container .sources-section { background: #fff; border-left: 1px solid #C5E3ED; border-right: 1px solid #C5E3ED; padding: 0 24px 20px; }
  .pdf-container .sources-list { padding-left: 18px; }
  .pdf-container .sources-list li { font-size: 11px; color: #6B7280; font-family: system-ui, sans-serif; margin-bottom: 3px; }

  .pdf-container .meta { background: #fff; border-left: 1px solid #C5E3ED; border-right: 1px solid #C5E3ED; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; }
  .pdf-container .mtitle { font-size: 18px; font-weight: bold; color: #004F7F; }
  .pdf-container .stats { background: #004F7F; padding: 16px 24px; display: flex; justify-content: space-around; flex-wrap: wrap; gap: 10px; }
  .pdf-container .si { text-align: center; }
  .pdf-container .sv { font-size: 24px; font-weight: bold; color: #00A3A3; }
  .pdf-container .sl { font-size: 10px; color: #C5E3ED; font-family: system-ui, sans-serif; margin-top: 2px; text-transform: uppercase; letter-spacing: .5px; }
  
  .pdf-container .tsec { background: #fff; border-left: 1px solid #C5E3ED; border-right: 1px solid #C5E3ED; padding: 20px 24px; }
  .pdf-container table { width: 100%; border-collapse: collapse; font-family: system-ui, sans-serif; }
  .pdf-container thead tr { background: #004F7F; }
  .pdf-container thead th { color: #fff; font-size: 11px; font-weight: 600; padding: 12px 10px; text-align: left; letter-spacing: .5px; text-transform: uppercase; }
  .pdf-container thead th:first-child { border-radius: 6px 0 0 0; }
  .pdf-container thead th:last-child { border-radius: 0 6px 0 0; }
  .pdf-container tbody tr:nth-child(even) { background: #F4FBFF; }
  .pdf-container tbody tr:nth-child(odd) { background: #fff; }
  .pdf-container tbody tr { border-bottom: 1px solid #E5F0F6; }
  .pdf-container tbody tr:last-child { border-bottom: none; }
  .pdf-container td { padding: 10px; vertical-align: middle; }
  .pdf-container .tnum { font-size: 14px; font-weight: bold; color: #004F7F; text-align: center; }
  .pdf-container .timg { text-align: center; }
  .pdf-container .timg img { width: 60px; height: 60px; border-radius: 8px; border: 2px solid #C5E3ED; object-fit: cover; display: block; margin: 0 auto; }
  .pdf-container .timg-ph { width: 60px; height: 60px; border-radius: 8px; border: 2px dashed #C5E3ED; display: flex; align-items: center; justify-content: center; color: #9CA3AF; font-size: 10px; margin: 0 auto; background: #F4FBFF; }
  .pdf-container .tdate { font-size: 12px; color: #374151; white-space: nowrap; }
  .pdf-container .loc-badge { display: inline-block; background: #E8F4F8; color: #004F7F; border: 1px solid #C5E3ED; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
  .pdf-container .plat-badge { display: inline-block; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 600; }
  .pdf-container .plat-app { background: #E8F4F8; color: #004F7F; border: 1px solid #C5E3ED; }
  .pdf-container .plat-web { background: #E6F4EA; color: #1A6B35; border: 1px solid #A8D5B5; }
  .pdf-container .tdesc { font-size: 11px; color: #374151; max-width: 150px; line-height: 1.4; }
  .pdf-container .tanal { font-size: 12px; font-weight: bold; color: #004F7F; line-height: 1.4; }

  .pdf-container .warning-section { background: #fff; border-left: 1px solid #C5E3ED; border-right: 1px solid #C5E3ED; padding: 0 24px 16px; }
  .pdf-container .warning-box { background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 12px 16px; font-family: system-ui, sans-serif; }
  .pdf-container .warning-box.yellow { background: #fff3cd; border-left-color: #ffc107; }
  .pdf-container .warning-title { font-size: 11px; color: #b91c1c; font-weight: bold; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
  .pdf-container .warning-text { font-size: 12px; color: #856404; line-height: 1.5; font-family: system-ui, sans-serif; }
  .pdf-container .warning-list { padding-left: 18px; color: #991b1b; }
  .pdf-container .warning-list li { font-size: 12px; line-height: 1.5; margin-bottom: 4px; }

  .pdf-container .footer { background: #004F7F; padding: 24px 20px; text-align: center; }
  .pdf-container .footer-divider { width: 40px; height: 2px; background: #00A3A3; margin: 0 auto 16px; border-radius: 10px; }
  .pdf-container .footer-brand { font-size: 18px; font-weight: bold; color: #fff; margin-bottom: 4px; }
  .pdf-container .footer-s { color: #00A3A3; }
  .pdf-container .footer-copy { color: #C5E3ED; font-size: 11px; font-family: system-ui, sans-serif; }
  .pdf-container .footer-email { color: #8ab4c9; font-size: 10px; margin-top: 4px; font-family: system-ui, sans-serif; }
`;

// ── 1. SINGLE REPORT HTML ──────────────────────────────────────────────────
const buildReportHTML = (params: {
    reportIndex: number; date: string; analysis: string; confidence: number;
    description: string; imageBase64: string; maskBase64: string;
    tips: string[]; precautions: string[]; sources: string[];
    patientName: string; gender: string; skinColor: string; bodyView: string;
    birthYear?: number; birthMonth?: number; birthDay?: number;
}) => {
    const age = params.birthYear ? `${new Date().getFullYear() - params.birthYear} years` : 'N/A';
    const dob = params.birthYear ? `${params.birthDay ?? '?'}/${params.birthMonth ?? '?'}/${params.birthYear}` : 'N/A';

    return `
    <div class="page single">
      <div class="header">
        <div class="brand"><span class="brand-s">S</span>kinSight</div>
        <div class="tagline">Snap · Detect · Protect</div>
        <div class="divider"></div>
      </div>
      <div class="banner"><p>Skin Analysis Report</p></div>
      <div class="report-bar">
        <div class="report-num">Report #${params.reportIndex}</div>
        <div class="report-date">${params.date}</div>
      </div>
      <div class="patient-section">
        <div class="section-title">Patient Information</div>
        <div class="patient-grid">
          <div class="info-item"><div class="info-label">Name</div><div class="info-value">${params.patientName || 'N/A'}</div></div>
          <div class="info-item"><div class="info-label">Gender</div><div class="info-value" style="text-transform:capitalize">${params.gender || 'N/A'}</div></div>
          <div class="info-item"><div class="info-label">Age</div><div class="info-value">${age}</div></div>
          <div class="info-item"><div class="info-label">Date of birth</div><div class="info-value">${dob}</div></div>
          <div class="info-item"><div class="info-label">Skin tone</div><div class="info-value" style="display:flex;align-items:center;gap:6px">${params.skinColor ? `<span style="width:14px;height:14px;border-radius:50%;background:${params.skinColor};display:inline-block;border:1px solid #ccc"></span>` : ''}N/A</div></div>
          <div class="info-item"><div class="info-label">Location</div><div class="info-value">${params.bodyView || 'N/A'}</div></div>
        </div>
      </div>
      <div class="image-section">
        ${params.imageBase64 ? `
        <div class="image-wrapper">
            <div class="img-label">Original Scan</div>
            <img src="${params.imageBase64}" alt="Scan image"/>
        </div>` : ''}
        ${params.maskBase64 ? `
        <div class="mask-wrapper">
            <div class="img-label" style="color: #00A3A3;">U-Net Segmentation</div>
            <img src="${params.maskBase64}" alt="Segmentation Mask"/>
        </div>` : ''}
      </div>
      <div class="analysis-section">
        <div class="section-title">Analysis Results</div>
        <div class="condition-row">
          <div class="condition-name">${params.analysis || 'Unknown condition'}</div>
          <div class="confidence-badge">${params.confidence?.toFixed(1) ?? '—'}% confidence</div>
        </div>
        ${params.confidence ? `
        <div class="confidence-bar-wrap">
          <div class="confidence-bar" style="width:${Math.min(params.confidence, 100)}%"></div>
        </div>` : ''}
        ${params.description ? `
        <div class="description-box">
          <div class="description-label">Clinical Overview</div>
          <div class="description-text">${params.description}</div>
        </div>` : ''}
        ${params.tips.length > 0 ? `
        <div class="description-box">
          <div class="description-label" style="color: #00A3A3;">Recommendations & Care</div>
          <ul class="tips-list">${params.tips.map(t => `<li>${t}</li>`).join('')}</ul>
        </div>` : ''}
      </div>
      ${params.precautions.length > 0 ? `
      <div class="warning-section">
        <div class="warning-box">
          <div class="warning-title">⚠️ When to see a doctor</div>
          <ul class="warning-list">${params.precautions.map(p => `<li>${p}</li>`).join('')}</ul>
        </div>
      </div>` : ''}
      ${params.sources.length > 0 ? `
      <div class="sources-section">
        <div class="section-title">Clinical Sources & References</div>
        <ul class="sources-list">${params.sources.map(s => `<li>${s}</li>`).join('')}</ul>
      </div>` : ''}
      <div class="warning-section">
        <div class="warning-box yellow">
          <p class="warning-text">⚠️ <strong>Medical Disclaimer:</strong> This report is generated by an AI model and is for informational purposes only. Always consult a qualified dermatologist.</p>
        </div>
      </div>
      <div class="footer">
        <div class="footer-divider"></div>
        <div class="footer-brand"><span class="footer-s">S</span>kinSight</div>
        <div class="footer-copy">© 2026 SkinSight — Graduation Project · Faculty of Computers &amp; AI</div>
        <div class="footer-email">📧 skinsight.help.2025@gmail.com</div>
      </div>
    </div>`;
};

// ── 2. SUMMARY (ALL REPORTS) HTML ─────────────────────────────────────────
const buildAllReportsHTML = (params: {
    rows: Array<{ index: number; date: string; bodyView: string; analysis: string; imageBase64: string; description: string; source: string; }>;
    patientName: string; gender: string; skinColor: string; generatedDate: string;
    birthYear?: number; birthMonth?: number; birthDay?: number;
}) => {
    const age = params.birthYear ? `${new Date().getFullYear() - params.birthYear} years` : 'N/A';

    return `
    <div class="page summary">
      <div class="header">
        <div class="brand"><span class="brand-s">S</span>kinSight</div>
        <div class="tagline">Snap · Detect · Protect</div>
        <div class="divider"></div>
      </div>
      <div class="banner"><p>Complete Skin Analysis Summary</p></div>
      <div class="meta">
        <div class="mtitle">All Reports — Full History</div>
        <div class="report-date">Generated: ${params.generatedDate}</div>
      </div>
      <div class="patient-section">
        <div class="section-title">Patient Information</div>
        <div class="patient-grid wide">
          <div class="info-item"><div class="info-label">Name</div><div class="info-value">${params.patientName || 'N/A'}</div></div>
          <div class="info-item"><div class="info-label">Age</div><div class="info-value">${age}</div></div>
          <div class="info-item"><div class="info-label">Gender</div><div class="info-value" style="text-transform:capitalize">${params.gender || 'N/A'}</div></div>
          <div class="info-item"><div class="info-label">Skin Tone</div><div class="info-value">${params.skinColor || 'N/A'}</div></div>
        </div>
      </div>
      <div class="stats">
        <div class="si"><div class="sv">${params.rows.length}</div><div class="sl">Total Reports</div></div>
        <div class="si"><div class="sv">${params.rows.filter(r => r.bodyView === 'front').length}</div><div class="sl">Front Body</div></div>
        <div class="si"><div class="sv">${params.rows.filter(r => r.bodyView === 'back').length}</div><div class="sl">Back Body</div></div>
        <div class="si"><div class="sv">${params.rows.filter(r => !isWeb(r.source)).length}</div><div class="sl">App Scans</div></div>
        <div class="si"><div class="sv">${params.rows.filter(r => isWeb(r.source)).length}</div><div class="sl">Web Scans</div></div>
      </div>
      <div class="tsec">
        <div class="section-title" style="margin-bottom: 16px;">📋 Scan History Table</div>
        <table>
          <thead>
            <tr>
              <th style="width:40px">#</th>
              <th style="width:80px; text-align:center;">Image</th>
              <th style="width:100px">Date</th>
              <th style="width:80px">Location</th>
              <th style="width:80px">Platform</th>
              <th style="width:200px">Description</th>
              <th>Analysis Result</th>
            </tr>
          </thead>
          <tbody>
            ${params.rows.map(row => `
            <tr>
              <td class="tnum">${row.index}</td>
              <td class="timg">${row.imageBase64 ? `<img src="${row.imageBase64}"/>` : `<div class="timg-ph">No Image</div>`}</td>
              <td class="tdate">${row.date}</td>
              <td><span class="loc-badge">${row.bodyView || 'N/A'}</span></td>
              <td><span class="plat-badge ${isWeb(row.source) ? 'plat-web' : 'plat-app'}">${isWeb(row.source) ? 'Web' : 'App'}</span></td>
              <td class="tdesc">${row.description || 'N/A'}</td>
              <td class="tanal">${row.analysis || 'Pending...'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="warning-section">
        <div class="warning-box yellow">
          <p class="warning-text">⚠️ <strong>Medical Disclaimer:</strong> This report is generated by an AI model and is for informational purposes only. Always consult a qualified dermatologist.</p>
        </div>
      </div>
      <div class="footer">
        <div class="footer-divider"></div>
        <div class="footer-brand"><span class="footer-s">S</span>kinSight</div>
        <div class="footer-copy">© 2026 SkinSight — Graduation Project · Faculty of Computers &amp; AI</div>
        <div class="footer-email">📧 skinsight.help.2025@gmail.com</div>
      </div>
    </div>`;
};

// ── Download Direct to Local PDF ──────────────────────────────────────────────
const downloadPDF = async (html: string, filename: string) => {
    // 1. We wrap everything perfectly in our scoped container
    const fullHtml = `
      <div class="pdf-container">
        <style>${CSS}</style>
        ${html}
      </div>
    `;

    try {
        if (!(window as any).html2pdf) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const opt = {
            margin:       0,
            filename:     `${filename}.pdf`,
            image:        { type: 'jpeg', quality: 1.0 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // 2. We pass the string directly! html2pdf will render it internally,
        // preventing the twitch and blank image bugs entirely.
        await (window as any).html2pdf().set(opt).from(fullHtml).save();

    } catch (err) {
        console.error(err);
        toast.error('Direct download failed, opening print dialog...');
        const fallbackHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${filename}</title><style>${CSS}</style></head><body><div class="pdf-container">${html}</div></body></html>`;
        const blob = new Blob([fallbackHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) { win.onload = () => { win.print(); }; }
    }
};

// ── Tooltip ───────────────────────────────────────────────────────────────────
const Tip: React.FC<{ text: string }> = ({ text }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative inline-flex">
            <button onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                <Info size={9}/>
            </button>
            <AnimatePresence>
                {show && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-52 px-3 py-2 rounded-xl text-xs leading-relaxed pointer-events-none"
                                style={{ background: 'var(--surface)', border: '1px solid var(--br)', color: 'var(--tx2)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                        {text}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── Main component ────────────────────────────────────────────────────────────
export const Reports: React.FC = () => {
    const { user, userProfile, isGuest } = useAuth();
    const navigate = useNavigate();
    const [scans, setScans]       = useState<Scan[]>([]);
    const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);
    const [loading, setLoading]   = useState(true);
    const [dlId, setDlId]         = useState<string | null>(null);
    const [dlAll, setDlAll]       = useState(false);
    const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

    useEffect(() => {
        if (isGuest || !user) { setLoading(false); return; }
        (async () => {
            try {
                const snap = await getDocs(query(collection(db, 'users', user.uid, 'scans')));
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Scan));

                docs.sort((a, b) => toMs(b.createdAt || b.timestamp) - toMs(a.createdAt || a.timestamp));

                setScans(docs);
                const freq: Record<string, number> = {};
                docs.forEach(s => {
                    const name = s.result?.disease || s.analysis || s.disease || 'Unknown condition';
                    freq[name] = (freq[name] || 0) + 1;
                });
                setChartData(Object.entries(freq).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, [user, isGuest]);

    const buildSingleParams = (scan: Scan, idx: number) => ({
        reportIndex:  scans.length - idx,
        date:         formatDate(scan.createdAt || scan.timestamp),
        analysis:     scan.result?.disease || scan.analysis || scan.disease || 'Unknown condition',
        confidence:   scan.result?.confidence ?? scan.confidence ?? 0,
        description:  scan.result?.description || scan.description || '',
        tips:         scan.result?.tips || scan.tips || [],
        precautions:  scan.result?.precautions || scan.precautions || [],
        sources:      scan.result?.sources || scan.sources || [],
        imageBase64:  '',
        maskBase64:   '',
        patientName:  userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : (user?.displayName || 'N/A'),
        gender:       userProfile?.gender || 'N/A',
        skinColor:    userProfile?.skinColor || '',
        bodyView:     scan.bodyView || 'N/A',
        birthYear:    userProfile?.birthYear,
        birthMonth:   userProfile?.birthMonth,
        birthDay:     userProfile?.birthDay,
    });

    const downloadOne = async (scan: Scan, idx: number) => {
        if (dlId || dlAll) return;
        setDlId(scan.id);
        toast('Generating PDF...', { icon: '⏳' });
        try {
            const imgUrl = scan.photoUri || scan.imageUrl || '';
            const base64 = imgUrl ? await urlToBase64(imgUrl) : '';

            const maskUrl = scan.result?.segmentedUrl || scan.segmentedUrl || '';
            const maskBase64 = maskUrl ? await urlToBase64(maskUrl) : '';

            const params = { ...buildSingleParams(scan, idx), imageBase64: base64, maskBase64 };
            await downloadPDF(buildReportHTML(params), `SkinSight_Report_${scans.length - idx}`);
            toast.success('Report downloaded successfully!');
        } catch { toast.error('Failed to generate report'); }
        finally { setDlId(null); }
    };

    const downloadAll = async () => {
        if (dlId || dlAll || scans.length === 0) return;
        setDlAll(true);
        toast('Generating Summary PDF...', { icon: '⏳' });
        try {
            const rows = await Promise.all(scans.map(async (scan, idx) => {
                const imgUrl = scan.photoUri || scan.imageUrl || '';
                const base64 = imgUrl ? await urlToBase64(imgUrl) : '';
                return {
                    index: scans.length - idx,
                    date: formatDate(scan.createdAt || scan.timestamp),
                    bodyView: scan.bodyView || 'N/A',
                    analysis: scan.result?.disease || scan.analysis || scan.disease || 'Unknown condition',
                    description: scan.result?.description || scan.description || 'N/A',
                    source: scan.source || 'mobile',
                    imageBase64: base64
                };
            }));

            const params = {
                rows,
                patientName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : (user?.displayName || 'N/A'),
                gender: userProfile?.gender || 'N/A',
                skinColor: userProfile?.skinColor || 'N/A',
                generatedDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                birthYear: userProfile?.birthYear,
                birthMonth: userProfile?.birthMonth,
                birthDay: userProfile?.birthDay,
            };

            await downloadPDF(buildAllReportsHTML(params), 'SkinSight_All_Reports_Summary');
            toast.success('Summary report downloaded successfully!');
        } catch { toast.error('Failed to generate summary report'); }
        finally { setDlAll(false); }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--br2)', borderTopColor: 'var(--accent)' }}/>
        </div>
    );

    if (isGuest) return (
        <div className="max-w-md mx-auto text-center py-20 space-y-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                 style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                <ShieldCheck size={36}/>
            </div>
            <h2 className="text-2xl font-extrabold" style={{ color: 'var(--tx)' }}>Sign up for reports</h2>
            <p style={{ color: 'var(--tx2)' }}>Create an account to see charts and download PDF reports of your scans.</p>
            <button onClick={() => navigate('/signup')} className="btn-accent px-6 py-3 rounded-xl text-sm">Create free account →</button>
        </div>
    );

    const stats = [
        { icon: Activity,   label: 'Total scans',       val: scans.length },
        { icon: Layers,     label: 'Unique conditions',  val: chartData.length },
        { icon: TrendingUp, label: 'Most detected',      val: chartData[0]?.name || '—' },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-8">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                        className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold" style={{ color: 'var(--tx)' }}>Health Reports</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--tx2)' }}>Insights and PDF exports based on your scan history.</p>
                </div>
                {scans.length > 0 && (
                    <button onClick={downloadAll} disabled={dlAll}
                            className="btn-accent px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-60">
                        {dlAll
                            ? <span className="spin w-4 h-4 border-2 border-current/30 border-t-current rounded-full"/>
                            : <Download size={15}/>}
                        {dlAll ? 'Generating…' : 'Download all PDFs'}
                    </button>
                )}
            </motion.div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.map(({ icon: Icon, label, val }, i) => (
                    <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.07 }}
                                className="rounded-2xl p-5 card-hover"
                                style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                 style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                                <Icon size={17}/>
                            </div>
                            <span className="text-xs font-semibold" style={{ color: 'var(--tx3)' }}>{label}</span>
                        </div>
                        <p className="text-2xl font-extrabold truncate"
                           style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{val}</p>
                    </motion.div>
                ))}
            </div>

            {/* Chart */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-extrabold" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                            Condition frequency
                        </h2>
                        <Tip text="Shows how often each detected condition appeared across all your scans."/>
                    </div>
                    {chartData.length > 0 && (
                        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface2)' }}>
                            {(['pie', 'bar'] as const).map(t => (
                                <button key={t} onClick={() => setChartType(t)}
                                        className="px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all"
                                        style={{ background: chartType === t ? 'var(--accent)' : 'transparent',
                                            color: chartType === t ? '#070d1a' : 'var(--tx2)' }}>
                                    {t} chart
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {chartData.length === 0 ? (
                    <div className="text-center py-12">
                        <TrendingUp size={32} className="mx-auto mb-3" style={{ color: 'var(--tx3)' }}/>
                        <p className="text-sm" style={{ color: 'var(--tx3)' }}>No data yet. Run some scans to see your report.</p>
                        <button onClick={() => navigate('/dashboard')} className="btn-accent mt-4 px-5 py-2 rounded-xl text-sm">
                            Start scanning →
                        </button>
                    </div>
                ) : (
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'pie' ? (
                                <PieChart>
                                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                                         paddingAngle={4} dataKey="value"
                                         label={({ cx, cy, midAngle, outerRadius, name, percent, fill }) => {
                                             const RADIAN = Math.PI / 180;
                                             const radius = outerRadius + 12;
                                             // @ts-ignore
                                             const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                             // @ts-ignore
                                             const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                             return (
                                                 <text x={x} y={y} fill={fill} fontSize="11" fontWeight="bold" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                                     {`${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                                 </text>
                                             );
                                         }}
                                         labelLine={{ stroke: 'var(--tx3)', strokeWidth: 1 }}>
                                        {chartData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]}/>)}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--br)', borderRadius: '12px', color: 'var(--tx)' }}/>
                                    <Legend/>
                                </PieChart>
                            ) : (
                                <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--br)"/>
                                    <XAxis dataKey="name" tick={{ fill: 'var(--tx3)', fontSize: 11 }} axisLine={false}/>
                                    <YAxis tick={{ fill: 'var(--tx3)', fontSize: 11 }} axisLine={false}/>
                                    <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--br)', borderRadius: '12px', color: 'var(--tx)' }}/>
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                        {chartData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]}/>)}
                                    </Bar>
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                )}
            </motion.div>

            {/* Per-scan report cards */}
            {scans.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                            className="space-y-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-extrabold" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                            Individual reports
                        </h2>
                        <Tip text="Each card represents one scan. Click 'Download PDF' to export a full branded report for that scan."/>
                    </div>

                    {scans.map((scan, i) => {
                        const condition = scan.result?.disease || scan.analysis || scan.disease || 'Unknown condition';
                        const imgUrl = scan.photoUri || scan.imageUrl || '';
                        const conf = scan.result?.confidence ?? scan.confidence ?? 0;
                        const confColor = conf >= 80 ? '#22c55e' : conf >= 60 ? '#f59e0b' : '#ef4444';

                        return (
                            <motion.div key={scan.id}
                                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        className="rounded-2xl overflow-hidden"
                                        style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
                                <div className="flex gap-4 p-4 sm:p-5">
                                    {/* Thumbnail */}
                                    {imgUrl && (
                                        <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden"
                                             style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                                            <img src={imgUrl} alt={condition} className="w-full h-full object-cover"
                                                 onError={e => { e.currentTarget.src = 'https://placehold.co/80x80/0f172a/00e5ff?text=N/A'; }}/>
                                        </div>
                                    )}

                                    {/* Details */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-start justify-between gap-2 flex-wrap">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--tx3)' }}>
                                                    Report #{scans.length - i}
                                                </p>
                                                <h3 className="font-extrabold text-base truncate"
                                                    style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                                                    {condition}
                                                </h3>
                                            </div>
                                            <span className="text-sm font-bold flex-shrink-0" style={{ color: confColor }}>
                        {conf.toFixed(1)}%
                      </span>
                                        </div>

                                        {/* Confidence bar */}
                                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--br2)' }}>
                                            <div className="h-full rounded-full"
                                                 style={{ width: `${conf}%`, background: `linear-gradient(90deg, ${confColor}77, ${confColor})` }}/>
                                        </div>

                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <p className="text-xs" style={{ color: 'var(--tx3)' }}>{formatDate(scan.createdAt || scan.timestamp)}</p>
                                            <button onClick={() => downloadOne(scan, i)} disabled={dlId === scan.id || dlAll}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                                                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,229,255,0.2)' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.2)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-dim)'; }}>
                                                {dlId === scan.id
                                                    ? <span className="spin w-3 h-3 border-2 border-current/30 border-t-current rounded-full"/>
                                                    : <FileText size={12}/>}
                                                {dlId === scan.id ? 'Generating…' : 'Download PDF'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}
        </div>
    );
};