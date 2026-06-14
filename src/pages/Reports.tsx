import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, getDocs, doc, setDoc } from 'firebase/firestore';
import { uploadPDFToCloudinary } from '../services/cloudinary';
import { TrendingUp, ShieldCheck, Activity, Layers, Download, FileText, Info, Cloud } from 'lucide-react';
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
  .pdf-container .page.single { width: 794px; }
  .pdf-container .page.summary { width: 794px; }
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
  .pdf-container .patient-grid.wide { grid-template-columns: repeat(4, 1fr); }
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

  /* ── Single-page compact overrides ─────────────────────────────────── */
  .pdf-container .page.single .header   { padding: 14px 24px 10px; }
  .pdf-container .page.single .brand    { font-size: 30px; }
  .pdf-container .page.single .tagline  { font-size: 10px; margin-top: 2px; }
  .pdf-container .page.single .divider  { margin: 6px auto 0; width: 36px; height: 2px; }
  .pdf-container .page.single .banner   { padding: 5px 20px; }
  .pdf-container .page.single .banner p { font-size: 11px; }
  .pdf-container .page.single .report-bar  { padding: 7px 20px; }
  .pdf-container .page.single .report-num  { font-size: 15px; }
  .pdf-container .page.single .patient-section { padding: 10px 20px; }
  .pdf-container .page.single .section-title   { font-size: 11px; margin-bottom: 8px; }
  .pdf-container .page.single .patient-grid    { gap: 6px; }
  .pdf-container .page.single .info-item  { padding: 6px 8px; }
  .pdf-container .page.single .info-label { font-size: 9px; }
  .pdf-container .page.single .info-value { font-size: 11px; }
  .pdf-container .page.single .image-section { padding: 0 20px 10px; }
  .pdf-container .page.single .image-wrapper img,
  .pdf-container .page.single .mask-wrapper img { max-height: 155px; }
  .pdf-container .page.single .analysis-section { padding: 10px 20px; }
  .pdf-container .page.single .condition-name  { font-size: 17px; }
  .pdf-container .page.single .description-box { padding: 8px 12px; margin-bottom: 8px; }
  .pdf-container .page.single .description-text { font-size: 11px; line-height: 1.5; }
  .pdf-container .page.single .tips-list li { font-size: 11px; margin-bottom: 3px; }
  .pdf-container .page.single .sources-section { padding: 0 20px 8px; }
  .pdf-container .page.single .sources-list li  { font-size: 9px; margin-bottom: 1px; }
  .pdf-container .page.single .warning-section  { padding: 0 20px 8px; }
  .pdf-container .page.single .warning-box   { padding: 8px 12px; }
  .pdf-container .page.single .warning-title { font-size: 10px; }
  .pdf-container .page.single .warning-text  { font-size: 10px; }
  .pdf-container .page.single .warning-list li { font-size: 10px; margin-bottom: 2px; }
  .pdf-container .page.single .footer       { padding: 10px 20px; }
  .pdf-container .page.single .footer-brand { font-size: 14px; }
  .pdf-container .page.single .footer-copy  { font-size: 9px; }
  .pdf-container .page.single .footer-email { font-size: 8px; margin-top: 2px; }

  /* ── Summary: mask column + confidence ──────────────────────────────── */
  .pdf-container .tmask { text-align: center; }
  .pdf-container .tmask img { width: 50px; height: 50px; border-radius: 6px; border: 2px solid #00A3A3; background: #060c10; object-fit: contain; display: block; margin: 0 auto; }
  .pdf-container .tmask-ph  { width: 50px; height: 50px; border-radius: 6px; border: 2px dashed #C5E3ED; display: flex; align-items: center; justify-content: center; color: #9CA3AF; font-size: 8px; margin: 0 auto; background: #F4FBFF; }
  .pdf-container .tconf { font-size: 12px; font-weight: bold; text-align: center; }
  .pdf-container .mini-hdr { background: #004F7F; padding: 8px 20px; display: flex; align-items: center; justify-content: space-between; }
`;

// ── Disease severity accent colors ────────────────────────────────────────────
const getDiseaseAccent = (analysis: string): string => {
    const a = analysis.toUpperCase();
    if (a.includes('MEL')) return '#b91c1c';
    if (a.includes('BCC')) return '#c2410c';
    if (a.includes('BKL')) return '#b45309';
    if (a.includes('NV'))  return '#15803d';
    return '#004F7F';
};

const getSeverity = (analysis: string): { label: string; color: string; bg: string; border: string } => {
    const a = analysis.toUpperCase();
    if (a.includes('MEL') || a.includes('BCC') || a.includes('SCC') || a.includes('AKIEC'))
        return { label: 'DANGEROUS: See a doctor immediately', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' };
    if (a.includes('VASC') || a.includes('AK') || a.includes('DF'))
        return { label: 'NEEDS CHECKUP: Monitor closely', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' };
    if (a.includes('NV') || a.includes('BKL') || a.includes('NEVUS'))
        return { label: 'LIKELY SAFE: Continue regular monitoring', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' };
    return { label: 'NEEDS CHECKUP: Consult a dermatologist', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' };
};

const getConfColor = (conf: number): string => conf >= 80 ? '#22c55e' : conf >= 60 ? '#f59e0b' : '#ef4444';

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
    const accent = getDiseaseAccent(params.analysis);
    const sev = getSeverity(params.analysis);
    const confColor = getConfColor(params.confidence ?? 0);

    return `
    <div class="page single" style="display:flex;flex-direction:column;height:1122px;overflow:hidden;">

      <div class="header" style="flex-shrink:0;">
        <div class="brand"><span class="brand-s">S</span>kinSight</div>
        <div class="tagline">Snap · Detect · Protect</div>
        <div class="divider"></div>
      </div>

      <div class="banner" style="flex-shrink:0;"><p>Skin Analysis Report</p></div>

      <div class="report-bar" style="flex-shrink:0;">
        <div class="report-num">Report #${params.reportIndex}</div>
        <div class="report-date">${params.date}</div>
      </div>

      <div style="flex-shrink:0;padding:8px 20px;background:#fff;border-left:1px solid #C5E3ED;border-right:1px solid #C5E3ED;border-top:1px solid #E5F0F6;">
        <div style="font-size:10px;font-weight:bold;color:#004F7F;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;font-family:system-ui,sans-serif;">Patient Information</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;">
          <div style="background:#F4FBFF;border-radius:6px;padding:5px 8px;border:1px solid #C5E3ED;"><div style="font-size:8px;color:#9CA3AF;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;font-family:system-ui,sans-serif;">Name</div><div style="font-size:10px;font-weight:bold;color:#1F2937;font-family:system-ui,sans-serif;">${params.patientName || 'N/A'}</div></div>
          <div style="background:#F4FBFF;border-radius:6px;padding:5px 8px;border:1px solid #C5E3ED;"><div style="font-size:8px;color:#9CA3AF;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;font-family:system-ui,sans-serif;">Gender</div><div style="font-size:10px;font-weight:bold;color:#1F2937;font-family:system-ui,sans-serif;text-transform:capitalize;">${params.gender || 'N/A'}</div></div>
          <div style="background:#F4FBFF;border-radius:6px;padding:5px 8px;border:1px solid #C5E3ED;"><div style="font-size:8px;color:#9CA3AF;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;font-family:system-ui,sans-serif;">Age</div><div style="font-size:10px;font-weight:bold;color:#1F2937;font-family:system-ui,sans-serif;">${age}</div></div>
          <div style="background:#F4FBFF;border-radius:6px;padding:5px 8px;border:1px solid #C5E3ED;"><div style="font-size:8px;color:#9CA3AF;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;font-family:system-ui,sans-serif;">Date of Birth</div><div style="font-size:10px;font-weight:bold;color:#1F2937;font-family:system-ui,sans-serif;">${dob}</div></div>
          <div style="background:#F4FBFF;border-radius:6px;padding:5px 8px;border:1px solid #C5E3ED;"><div style="font-size:8px;color:#9CA3AF;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;font-family:system-ui,sans-serif;">Skin Tone</div><div style="font-size:10px;font-weight:bold;color:#1F2937;font-family:system-ui,sans-serif;">N/A</div></div>
          <div style="background:#F4FBFF;border-radius:6px;padding:5px 8px;border:1px solid #C5E3ED;"><div style="font-size:8px;color:#9CA3AF;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;font-family:system-ui,sans-serif;">Location</div><div style="font-size:10px;font-weight:bold;color:#1F2937;font-family:system-ui,sans-serif;">${params.bodyView || 'N/A'}</div></div>
        </div>
      </div>

      ${(params.imageBase64 || params.maskBase64) ? `
      <div style="flex-shrink:0;padding:0 20px 10px;background:#fff;border-left:1px solid #C5E3ED;border-right:1px solid #C5E3ED;border-top:1px solid #E5F0F6;">
        <div style="display:flex;gap:14px;">
          ${params.imageBase64 ? `
          <div style="flex:1;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(0,79,127,0.12);">
            <div style="padding:5px 10px 3px;font-size:9px;font-weight:bold;color:#9CA3AF;text-transform:uppercase;letter-spacing:.5px;background:#F4FBFF;font-family:system-ui,sans-serif;">Original Scan</div>
            <div style="height:115px;background:#F4FBFF;display:flex;align-items:center;justify-content:center;">
              <img src="${params.imageBase64}" alt="Scan" style="max-width:96%;max-height:108px;object-fit:contain;display:block;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,0.15);"/>
            </div>
          </div>` : ''}
          ${params.maskBase64 ? `
          <div style="flex:1;border:2px solid #00A3A3;border-radius:14px;overflow:hidden;">
            <div style="padding:5px 10px 3px;font-size:9px;font-weight:bold;color:#00A3A3;text-transform:uppercase;letter-spacing:.5px;background:#060c10;font-family:system-ui,sans-serif;">U-Net Segmentation</div>
            <div style="height:115px;background:#060c10;display:flex;align-items:center;justify-content:center;">
              <img src="${params.maskBase64}" alt="Mask" style="max-width:100%;max-height:115px;object-fit:contain;display:block;"/>
            </div>
          </div>` : ''}
        </div>
      </div>` : ''}

      <div style="flex:1;overflow:hidden;padding:12px 20px;background:#fff;border-left:1px solid #C5E3ED;border-right:1px solid #C5E3ED;border-top:1px solid #E5F0F6;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <div style="width:4px;height:26px;background:${accent};border-radius:4px;flex-shrink:0;"></div>
          <div style="font-size:11px;font-weight:bold;color:#004F7F;text-transform:uppercase;letter-spacing:.5px;font-family:system-ui,sans-serif;">Analysis Results</div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
          <div style="font-size:17px;font-weight:bold;color:${accent};font-family:system-ui,sans-serif;">${params.analysis || 'Unknown condition'}</div>
          <div style="display:inline-flex;align-items:center;padding:4px 12px;border-radius:20px;background:${sev.bg};border:1px solid ${sev.border};white-space:nowrap;flex-shrink:0;">
            <span style="font-size:10px;font-weight:bold;color:${sev.color};font-family:system-ui,sans-serif;">${sev.label}</span>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
          <div style="font-size:10px;color:#6B7280;font-family:system-ui,sans-serif;">Confidence Score</div>
          <div style="font-size:12px;font-weight:bold;color:${confColor};font-family:system-ui,sans-serif;">${params.confidence?.toFixed(1) ?? '—'}%</div>
        </div>
        <div style="height:7px;background:#E5F0F6;border-radius:6px;overflow:hidden;margin-bottom:12px;">
          <div style="height:100%;width:${Math.min(params.confidence ?? 0, 100)}%;background:linear-gradient(90deg,${confColor}99,${confColor});border-radius:6px;"></div>
        </div>

        ${params.description ? `
        <div style="background:#F4FBFF;border-radius:8px;padding:8px 12px;border:1px solid #C5E3ED;margin-bottom:8px;">
          <div style="font-size:9px;color:#9CA3AF;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;font-family:system-ui,sans-serif;">Clinical Overview</div>
          <div style="font-size:11px;color:#374151;line-height:1.5;font-family:system-ui,sans-serif;">${params.description}</div>
        </div>` : ''}

        ${params.tips.length > 0 ? `
        <div style="background:#F4FBFF;border-radius:8px;padding:8px 12px;border:1px solid #C5E3ED;margin-bottom:8px;">
          <div style="font-size:9px;color:#00A3A3;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;font-family:system-ui,sans-serif;">Recommendations & Care</div>
          <ul style="padding-left:16px;margin:0;">${params.tips.map(t => `<li style="font-size:11px;color:#374151;line-height:1.5;font-family:system-ui,sans-serif;margin-bottom:3px;">${t}</li>`).join('')}</ul>
        </div>` : ''}

        ${params.precautions.length > 0 ? `
        <div style="background:#fef2f2;border-left:3px solid #ef4444;border-radius:6px;padding:7px 12px;margin-bottom:8px;">
          <div style="font-size:9px;color:#b91c1c;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;font-family:system-ui,sans-serif;">⚠ When to see a doctor</div>
          <ul style="padding-left:16px;margin:0;">${params.precautions.map(p => `<li style="font-size:10px;color:#991b1b;line-height:1.5;font-family:system-ui,sans-serif;margin-bottom:2px;">${p}</li>`).join('')}</ul>
        </div>` : ''}

        ${params.sources.length > 0 ? `
        <div style="margin-bottom:8px;">
          <div style="font-size:8px;color:#9CA3AF;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;font-family:system-ui,sans-serif;">Clinical Sources</div>
          <ul style="padding-left:14px;margin:0;">${params.sources.map(s => `<li style="font-size:7.5px;color:#6B7280;font-family:system-ui,sans-serif;line-height:1.4;margin-bottom:1px;word-break:break-word;">${s}</li>`).join('')}</ul>
        </div>` : ''}
      </div>

      <div style="flex-shrink:0;padding:0 20px 10px;background:#fff;border-left:1px solid #C5E3ED;border-right:1px solid #C5E3ED;">
        <div style="background:#fffbeb;border-left:3px solid #fbbf24;border-radius:6px;padding:8px 12px;">
          <p style="font-size:10px;color:#92400e;font-family:system-ui,sans-serif;margin:0;"><strong>Medical Disclaimer:</strong> This report is generated by an AI model and is for informational purposes only. Always consult a qualified dermatologist.</p>
        </div>
      </div>

      <div class="footer" style="flex-shrink:0;">
        <div class="footer-divider"></div>
        <div class="footer-brand"><span class="footer-s">S</span>kinSight</div>
        <div class="footer-copy">© 2026 SkinSight — Graduation Project · Faculty of Computers &amp; AI</div>
        <div class="footer-email">📧 skinsight.help.2025@gmail.com</div>
      </div>

    </div>`;
};

// ── 2. SUMMARY (ALL REPORTS) HTML ─────────────────────────────────────────
const buildAllReportsHTML = (params: {
    rows: Array<{
        index: number; date: string; bodyView: string; analysis: string;
        confidence: number; imageBase64: string; maskBase64: string; source: string;
    }>;
    patientName: string; gender: string; skinColor: string; generatedDate: string;
    birthYear?: number; birthMonth?: number; birthDay?: number;
}) => {
    const age = params.birthYear ? `${new Date().getFullYear() - params.birthYear} years` : 'N/A';
    const dob = params.birthYear ? `${params.birthDay ?? '?'}/${params.birthMonth ?? '?'}/${params.birthYear}` : 'N/A';

    // Dynamic chunking — conservative row estimates to avoid overflow
    const ROWS_P1   = 9;   // first page has more fixed sections
    const ROWS_CONT = 12;  // continuation pages have only mini-header + footer
    const chunks: (typeof params.rows)[] = [];
    if (params.rows.length === 0) {
        chunks.push([]);
    } else {
        chunks.push(params.rows.slice(0, ROWS_P1));
        let i = ROWS_P1;
        while (i < params.rows.length) {
            chunks.push(params.rows.slice(i, i + ROWS_CONT));
            i += ROWS_CONT;
        }
    }

    // ── Shared table header ───────────────────────────────────────────────
    const thStyle = 'padding:9px 6px;color:#fff;font-size:9px;font-weight:600;font-family:system-ui,sans-serif;letter-spacing:.3px;';
    const tHead = `
      <thead><tr style="background:#004F7F;">
        <th style="${thStyle}text-align:center;width:3%;">#</th>
        <th style="${thStyle}text-align:left;width:11%;">Date</th>
        <th style="${thStyle}text-align:center;width:8%;">Scan</th>
        <th style="${thStyle}text-align:center;width:8%;">Mask</th>
        <th style="${thStyle}text-align:left;width:19%;">Analysis Result</th>
        <th style="${thStyle}text-align:center;width:10%;">Location</th>
        <th style="${thStyle}text-align:center;width:9%;">Platform</th>
        <th style="${thStyle}text-align:center;width:13%;">Confidence</th>
        <th style="${thStyle}text-align:center;width:19%;">Severity</th>
      </tr></thead>`;

    // ── Row builder ───────────────────────────────────────────────────────
    const buildRows = (rows: typeof params.rows) => rows.map((row, ri) => {
        const accent    = getDiseaseAccent(row.analysis);
        const confColor = getConfColor(row.confidence);
        const sev       = getSeverity(row.analysis);
        const a         = row.analysis.toUpperCase();
        const isDanger  = a.includes('MEL') || a.includes('BCC') || a.includes('SCC') || a.includes('AKIEC');
        const isSafe    = a.includes('NV') || a.includes('BKL') || a.includes('NEVUS');
        const sevText   = isDanger ? 'DANGEROUS' : isSafe ? 'SAFE' : 'MONITOR';
        const conf      = row.confidence > 0 ? `${row.confidence.toFixed(1)}%` : 'N/A';
        const confWidth = row.confidence > 0 ? Math.min(row.confidence, 100) : 0;
        const rowBg     = ri % 2 === 0 ? '#ffffff' : '#F4FBFF';
        const td        = `padding:7px 6px;vertical-align:middle;`;
        return `<tr style="background:${rowBg};border-bottom:1px solid #E5F0F6;">
          <td style="${td}text-align:center;font-size:11px;font-weight:bold;color:#004F7F;font-family:system-ui,sans-serif;">${row.index}</td>
          <td style="${td}font-size:8px;color:#374151;font-family:system-ui,sans-serif;line-height:1.3;">${row.date}</td>
          <td style="${td}text-align:center;">${row.imageBase64
            ? `<img src="${row.imageBase64}" style="width:46px;height:46px;border-radius:7px;object-fit:cover;display:block;margin:0 auto;box-shadow:0 1px 5px rgba(0,0,0,0.18);"/>`
            : `<div style="width:46px;height:46px;border-radius:7px;border:1.5px dashed #C5E3ED;display:flex;align-items:center;justify-content:center;color:#9CA3AF;font-size:8px;margin:0 auto;background:#F4FBFF;font-family:system-ui,sans-serif;">N/A</div>`}</td>
          <td style="${td}text-align:center;">${row.maskBase64
            ? `<img src="${row.maskBase64}" style="width:46px;height:46px;border-radius:7px;object-fit:contain;background:#060c10;display:block;margin:0 auto;border:1.5px solid #00A3A3;"/>`
            : `<div style="width:46px;height:46px;border-radius:7px;border:1.5px dashed #C5E3ED;display:flex;align-items:center;justify-content:center;color:#9CA3AF;font-size:8px;margin:0 auto;background:#F4FBFF;font-family:system-ui,sans-serif;">N/A</div>`}</td>
          <td style="${td}font-size:10px;font-weight:bold;color:${accent};font-family:system-ui,sans-serif;line-height:1.3;">${row.analysis || 'Unknown'}</td>
          <td style="${td}text-align:center;">
            <span style="display:inline-block;background:#E8F4F8;color:#004F7F;border:1px solid #C5E3ED;border-radius:5px;padding:2px 5px;font-size:8px;font-weight:600;font-family:system-ui,sans-serif;">${row.bodyView || 'N/A'}</span>
          </td>
          <td style="${td}text-align:center;">
            <span style="display:inline-block;border-radius:5px;padding:2px 5px;font-size:8px;font-weight:600;font-family:system-ui,sans-serif;${isWeb(row.source) ? 'background:#E6F4EA;color:#1A6B35;border:1px solid #A8D5B5;' : 'background:#E8F4F8;color:#004F7F;border:1px solid #C5E3ED;'}">${isWeb(row.source) ? 'Web' : 'App'}</span>
          </td>
          <td style="${td}">
            <div style="font-size:11px;font-weight:bold;color:${confColor};font-family:system-ui,sans-serif;text-align:center;margin-bottom:3px;">${conf}</div>
            <div style="height:5px;background:#E5F0F6;border-radius:4px;overflow:hidden;">
              <div style="height:100%;width:${confWidth}%;background:linear-gradient(90deg,${confColor}99,${confColor});border-radius:4px;"></div>
            </div>
          </td>
          <td style="${td}text-align:center;">
            <span style="display:inline-block;padding:4px 8px;border-radius:10px;background:${sev.bg};border:1px solid ${sev.border};font-size:9px;font-weight:700;color:${sev.color};font-family:system-ui,sans-serif;letter-spacing:.3px;">${sevText}</span>
          </td>
        </tr>`;
    }).join('');

    // ── Reusable disclaimer & footer ──────────────────────────────────────
    const disclaimer = `
      <div style="padding:6px 20px 8px;background:#fff;border-left:1px solid #C5E3ED;border-right:1px solid #C5E3ED;">
        <div style="background:#fffbeb;border-left:3px solid #fbbf24;border-radius:6px;padding:7px 12px;">
          <p style="font-size:9.5px;color:#92400e;font-family:system-ui,sans-serif;margin:0;"><strong>Medical Disclaimer:</strong> This report is generated by an AI model for informational purposes only. Always consult a qualified dermatologist.</p>
        </div>
      </div>`;

    const footer = `
      <div class="footer" style="padding:10px 20px;flex-shrink:0;">
        <div class="footer-divider"></div>
        <div class="footer-brand" style="font-size:14px;"><span class="footer-s">S</span>kinSight</div>
        <div class="footer-copy">© 2026 SkinSight — Graduation Project · Faculty of Computers &amp; AI</div>
        <div class="footer-email">📧 skinsight.help.2025@gmail.com</div>
      </div>`;

    // ── Page 1 ────────────────────────────────────────────────────────────
    let pages = `
    <div class="page summary" style="height:1122px;overflow:hidden;display:flex;flex-direction:column;background:#D8E9F0;">

      <div class="header" style="padding:12px 24px 8px;flex-shrink:0;">
        <div class="brand" style="font-size:28px;"><span class="brand-s">S</span>kinSight</div>
        <div class="tagline" style="font-size:10px;margin-top:2px;">Snap · Detect · Protect</div>
        <div class="divider" style="margin:5px auto 0;"></div>
      </div>

      <div class="banner" style="padding:4px 20px;flex-shrink:0;"><p style="font-size:11px;">Complete Skin Analysis Summary</p></div>

      <div style="flex-shrink:0;padding:7px 20px;background:#fff;border-left:1px solid #C5E3ED;border-right:1px solid #C5E3ED;display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:13px;font-weight:bold;color:#004F7F;font-family:Georgia,serif;">All Reports — Full History</div>
        <div style="font-size:9.5px;color:#6B7280;font-family:system-ui,sans-serif;">Generated: ${params.generatedDate}</div>
      </div>

      <div style="flex-shrink:0;padding:7px 20px 8px;background:#fff;border-left:1px solid #C5E3ED;border-right:1px solid #C5E3ED;border-top:1px solid #E5F0F6;">
        <div style="font-size:10px;font-weight:bold;color:#004F7F;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;font-family:system-ui,sans-serif;">Patient Information</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:5px;">
          <div style="background:#F4FBFF;border-radius:6px;padding:5px 8px;border:1px solid #C5E3ED;"><div style="font-size:8px;color:#9CA3AF;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;font-family:system-ui,sans-serif;">Name</div><div style="font-size:10px;font-weight:bold;color:#1F2937;font-family:system-ui,sans-serif;">${params.patientName || 'N/A'}</div></div>
          <div style="background:#F4FBFF;border-radius:6px;padding:5px 8px;border:1px solid #C5E3ED;"><div style="font-size:8px;color:#9CA3AF;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;font-family:system-ui,sans-serif;">Gender</div><div style="font-size:10px;font-weight:bold;color:#1F2937;font-family:system-ui,sans-serif;text-transform:capitalize;">${params.gender || 'N/A'}</div></div>
          <div style="background:#F4FBFF;border-radius:6px;padding:5px 8px;border:1px solid #C5E3ED;"><div style="font-size:8px;color:#9CA3AF;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;font-family:system-ui,sans-serif;">Age</div><div style="font-size:10px;font-weight:bold;color:#1F2937;font-family:system-ui,sans-serif;">${age}</div></div>
          <div style="background:#F4FBFF;border-radius:6px;padding:5px 8px;border:1px solid #C5E3ED;"><div style="font-size:8px;color:#9CA3AF;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;font-family:system-ui,sans-serif;">Date of Birth</div><div style="font-size:10px;font-weight:bold;color:#1F2937;font-family:system-ui,sans-serif;">${dob}</div></div>
          <div style="background:#F4FBFF;border-radius:6px;padding:5px 8px;border:1px solid #C5E3ED;"><div style="font-size:8px;color:#9CA3AF;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;font-family:system-ui,sans-serif;">Skin Tone</div><div style="font-size:10px;font-weight:bold;color:#1F2937;font-family:system-ui,sans-serif;">N/A</div></div>
        </div>
      </div>

      <div style="flex-shrink:0;background:#004F7F;padding:10px 24px;display:flex;justify-content:space-around;align-items:center;">
        <div style="text-align:center;"><div style="font-size:20px;font-weight:bold;color:#00A3A3;font-family:Georgia,serif;">${params.rows.length}</div><div style="font-size:8.5px;color:#C5E3ED;font-family:system-ui,sans-serif;margin-top:2px;text-transform:uppercase;letter-spacing:.5px;">Total</div></div>
        <div style="text-align:center;"><div style="font-size:20px;font-weight:bold;color:#00A3A3;font-family:Georgia,serif;">${params.rows.filter(r => (r.bodyView||'').toLowerCase().includes('front')).length}</div><div style="font-size:8.5px;color:#C5E3ED;font-family:system-ui,sans-serif;margin-top:2px;text-transform:uppercase;letter-spacing:.5px;">Front</div></div>
        <div style="text-align:center;"><div style="font-size:20px;font-weight:bold;color:#00A3A3;font-family:Georgia,serif;">${params.rows.filter(r => (r.bodyView||'').toLowerCase().includes('back')).length}</div><div style="font-size:8.5px;color:#C5E3ED;font-family:system-ui,sans-serif;margin-top:2px;text-transform:uppercase;letter-spacing:.5px;">Back</div></div>
        <div style="text-align:center;"><div style="font-size:20px;font-weight:bold;color:#00A3A3;font-family:Georgia,serif;">${params.rows.filter(r => !isWeb(r.source)).length}</div><div style="font-size:8.5px;color:#C5E3ED;font-family:system-ui,sans-serif;margin-top:2px;text-transform:uppercase;letter-spacing:.5px;">App</div></div>
        <div style="text-align:center;"><div style="font-size:20px;font-weight:bold;color:#00A3A3;font-family:Georgia,serif;">${params.rows.filter(r => isWeb(r.source)).length}</div><div style="font-size:8.5px;color:#C5E3ED;font-family:system-ui,sans-serif;margin-top:2px;text-transform:uppercase;letter-spacing:.5px;">Web</div></div>
      </div>

      <div style="flex:1;overflow:hidden;padding:8px 20px 0;background:#fff;border-left:1px solid #C5E3ED;border-right:1px solid #C5E3ED;border-top:1px solid #E5F0F6;">
        <div style="font-size:10px;font-weight:bold;color:#004F7F;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;font-family:system-ui,sans-serif;">Scan History${chunks.length > 1 ? ` (Page 1 of ${chunks.length})` : ''}</div>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
          ${tHead}
          <tbody>${buildRows(chunks[0] || [])}</tbody>
        </table>
      </div>

      <div style="flex-shrink:0;">
        ${chunks.length === 1 ? disclaimer : ''}
        ${footer}
      </div>

    </div>`;

    // ── Pages 2+ ──────────────────────────────────────────────────────────
    for (let i = 1; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1;
        pages += `
    <div class="page summary" style="height:1122px;overflow:hidden;display:flex;flex-direction:column;background:#D8E9F0;">

      <div style="flex-shrink:0;padding:8px 20px;background:#004F7F;display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:16px;color:#fff;font-weight:bold;font-family:Georgia,serif;"><span style="color:#00A3A3;font-size:20px;">S</span>kinSight</div>
        <div style="color:#C5E3ED;font-size:9.5px;font-family:system-ui,sans-serif;">Page ${i + 1} of ${chunks.length} &middot; All Reports Summary</div>
      </div>

      <div style="flex:1;overflow:hidden;padding:10px 20px 0;background:#fff;border-left:1px solid #C5E3ED;border-right:1px solid #C5E3ED;">
        <div style="font-size:10px;font-weight:bold;color:#004F7F;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;font-family:system-ui,sans-serif;">Scan History (continued)</div>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
          ${tHead}
          <tbody>${buildRows(chunks[i])}</tbody>
        </table>
      </div>

      <div style="flex-shrink:0;">
        ${isLast ? disclaimer : ''}
        ${footer}
      </div>

    </div>`;
    }

    return pages;
};

// ── Load html2canvas + jsPDF independently (no html2pdf wrapper) ─────────────
const loadScript = (src: string): Promise<void> =>
    new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => resolve();
        s.onerror = reject;
        document.head.appendChild(s);
    });

const ensureLibs = async (): Promise<void> => {
    const w = window as any;
    const needCanvas = !w.html2canvas;
    const needPdf    = !w.jspdf?.jsPDF;
    await Promise.all([
        needCanvas ? loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js') : Promise.resolve(),
        needPdf    ? loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')       : Promise.resolve(),
    ]);
};

const generateAndUploadPDF = async (
    html: string,
    filename: string,
    uid: string | undefined,
    scanId: string | undefined,
    db: any,
): Promise<void> => {
    await ensureLibs();

    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-pdf', 'true');
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    const container = document.createElement('div');
    container.className = 'pdf-container';
    container.innerHTML = html;
    container.style.cssText = 'position:fixed;top:0;left:-9999px;width:794px;z-index:1;pointer-events:none;';
    document.body.appendChild(container);

    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));

    let pdfBlob: Blob;
    try {
        const h2c = (window as any).html2canvas as (el: HTMLElement, opts: object) => Promise<HTMLCanvasElement>;
        const { jsPDF } = (window as any).jspdf as { jsPDF: any };
        const pdf   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();

        // Capture the full container once
        const full = await h2c(container, {
            scale: 2, useCORS: true, logging: false,
            scrollX: 0, scrollY: 0,
            width: 794, windowWidth: 794,
            height: container.offsetHeight,
        });

        const pageEls = Array.from(container.querySelectorAll('.page')) as HTMLElement[];

        if (pageEls.length > 1) {
            // Multi-page: crop each .page div from the full canvas
            for (let i = 0; i < pageEls.length; i++) {
                if (i > 0) pdf.addPage();
                const el  = pageEls[i];
                const top = el.offsetTop * 2;
                const h   = el.offsetHeight * 2;
                const crop = document.createElement('canvas');
                crop.width  = full.width;
                crop.height = h;
                crop.getContext('2d')!.drawImage(full, 0, top, full.width, h, 0, 0, full.width, h);
                pdf.addImage(crop.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageW, pageH);
            }
        } else {
            // Single page: natural aspect ratio, continue to next page if content overflows
            const imgH = (full.height / full.width) * pageW;
            let yLeft  = imgH;
            let yPos   = 0;
            const imgData = full.toDataURL('image/jpeg', 0.95);
            pdf.addImage(imgData, 'JPEG', 0, yPos, pageW, imgH);
            yLeft -= pageH;
            while (yLeft > 0) {
                yPos -= pageH;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, yPos, pageW, imgH);
                yLeft -= pageH;
            }
        }

        pdfBlob = pdf.output('blob');
    } finally {
        document.body.removeChild(container);
        document.head.removeChild(styleEl);
    }

    const blobUrl = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

    uploadPDFToCloudinary(pdfBlob, filename).then(cloudUrl => {
        if (cloudUrl && uid && scanId) {
            const reportRef = doc(db, 'users', uid, 'reports', scanId);
            setDoc(reportRef, {
                reportUrl:   cloudUrl,
                filename:    `${filename}.pdf`,
                generatedAt: new Date().toISOString(),
            }, { merge: true }).catch(() => {});
        }
    }).catch(() => {});
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
        toast('Uploading & generating PDF…', { icon: '⏳' });
        try {
            const imgUrl  = scan.photoUri || scan.imageUrl || '';
            const base64  = imgUrl ? await urlToBase64(imgUrl) : '';
            const maskUrl = scan.result?.segmentedUrl || scan.segmentedUrl || '';
            const maskBase64 = maskUrl ? await urlToBase64(maskUrl) : '';
            const filename = `SkinSight_Report_${scans.length - idx}`;
            const params = { ...buildSingleParams(scan, idx), imageBase64: base64, maskBase64 };
            await generateAndUploadPDF(buildReportHTML(params), filename, user?.uid, scan.id, db);
            toast.success('Report downloaded!');
        } catch (e: any) {
            console.error(e);
            toast.error('Failed to generate report');
        }
        finally { setDlId(null); }
    };

    const downloadAll = async () => {
        if (dlId || dlAll || scans.length === 0) return;
        setDlAll(true);
        toast('Generating Summary PDF…', { icon: '⏳' });
        try {
            const rows = await Promise.all(scans.map(async (scan, idx) => {
                const imgUrl  = scan.photoUri || scan.imageUrl || '';
                const maskUrl = scan.result?.segmentedUrl || scan.segmentedUrl || '';
                const [base64, maskBase64] = await Promise.all([
                    imgUrl  ? urlToBase64(imgUrl)  : Promise.resolve(''),
                    maskUrl ? urlToBase64(maskUrl) : Promise.resolve(''),
                ]);
                return {
                    index:       scans.length - idx,
                    date:        formatDate(scan.createdAt || scan.timestamp),
                    bodyView:    scan.bodyView || 'N/A',
                    analysis:    scan.result?.disease || scan.analysis || scan.disease || 'Unknown condition',
                    confidence:  scan.result?.confidence ?? scan.confidence ?? 0,
                    source:      scan.source || 'mobile',
                    imageBase64: base64,
                    maskBase64,
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

            await generateAndUploadPDF(buildAllReportsHTML(params), 'SkinSight_All_Reports_Summary', user?.uid, 'summary', db);
            toast.success('Summary report downloaded!');
        } catch (e: any) {
            console.error(e);
            toast.error('Failed to generate summary report');
        }
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
            <button onClick={() => navigate('/signup')} className="btn-accent px-6 py-3 rounded-xl text-sm">Create free account</button>
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
                        className="rounded-2xl p-6 overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
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
                            Start scanning
                        </button>
                    </div>
                ) : (
                    <div className="h-96 sm:h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'pie' ? (
                                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={38} outerRadius={55}
                                         paddingAngle={4} dataKey="value"
                                         label={({ cx, cy, midAngle, outerRadius, name, percent, fill }) => {
                                             const RADIAN = Math.PI / 180;
                                             const radius = outerRadius + 14;
                                             // @ts-ignore
                                             const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                             // @ts-ignore
                                             const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                             const abbr = name.match(/\(([A-Z]+)\)/)?.[1] ?? name.split(' ')[0].slice(0, 5);
                                             return (
                                                 <text x={x} y={y} fill={fill} fontSize="10" fontWeight="bold" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                                     {`${abbr} ${((percent || 0) * 100).toFixed(0)}%`}
                                                 </text>
                                             );
                                         }}
                                         labelLine={{ stroke: 'var(--tx3)', strokeWidth: 1 }}>
                                        {chartData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]}/>)}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--br)', borderRadius: '12px', color: 'var(--tx)' }}
                                             formatter={(value, name) => [value, name]}/>
                                    <Legend/>
                                </PieChart>
                            ) : (
                                <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 60, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--br)"/>
                                    <XAxis dataKey="name" tick={{ fill: 'var(--tx3)', fontSize: 9 }} axisLine={false}
                                           angle={-35} textAnchor="end" height={60} interval={0}/>
                                    <YAxis tick={{ fill: 'var(--tx3)', fontSize: 10 }} axisLine={false}/>
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
                                    {/* Thumbnail: original scan */}
                                    {imgUrl && (
                                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
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