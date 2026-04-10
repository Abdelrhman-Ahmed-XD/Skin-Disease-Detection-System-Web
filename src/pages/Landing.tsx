import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Brain,
  Camera,
  ChartNoAxesCombined,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
};

export const Landing: React.FC = () => {
  const { user, isGuest, loginAsGuest } = useAuth();
  const navigate = useNavigate();

  const primaryHref = user || isGuest ? '/dashboard' : '/signup';
  const primaryLabel = user || isGuest ? 'Open Workspace' : 'Start Free';

  const features = [
    {
      title: 'Structured intake',
      description: 'Collect image quality, lesion size, symptoms, and notes before analysis to reduce weak inputs.',
      icon: Stethoscope,
    },
    {
      title: 'Screening intelligence',
      description: 'Combine model output with human-readable risk framing, confidence, and next-step guidance.',
      icon: Brain,
    },
    {
      title: 'Timeline tracking',
      description: 'Save scans over time and compare how visible lesions evolve between check-ins.',
      icon: ChartNoAxesCombined,
    },
    {
      title: 'Professional clarity',
      description: 'Pair strong visual hierarchy, plain-language guidance, and focused calls to action across the flow.',
      icon: ShieldCheck,
    },
  ];

  const workflow = [
    {
      title: 'Upload a clear photo',
      description: 'Start with a close, well-lit image that keeps the lesion centered and unobstructed.',
      icon: Camera,
    },
    {
      title: 'Auto-scan instantly',
      description: 'As soon as the image is uploaded, the analysis starts automatically and prepares the result view.',
      icon: BookOpen,
    },
    {
      title: 'Review and follow up',
      description: 'Use the assessment, history, and report views to decide whether the case needs faster escalation.',
      icon: BadgeCheck,
    },
  ];

  const highlights = [
    'Pigmented lesion review',
    'Inflammatory skin patterns',
    'ABCDE warning support',
    'Instant scan workflow',
  ];

  const benefitCards = [
    {
      title: 'Clear intake before analysis',
      description: 'The interface pushes users toward better image quality and better context before the model responds.',
    },
    {
      title: 'Readable risk communication',
      description: 'Results feel less like raw model output and more like a guided screening review.',
    },
    {
      title: 'Traceable follow-up',
      description: 'History and report routes stay connected to the main product instead of living in a disconnected demo.',
    },
  ];

  const handleDemoAccess = () => {
    if (!user && !isGuest) {
      loginAsGuest();
    }
    navigate('/dashboard');
  };

  return (
    <div className="space-y-8 pb-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-[radial-gradient(circle_at_top_left,_rgba(207,164,101,0.18),_transparent_30%),linear-gradient(135deg,_rgba(254,250,244,0.96),_rgba(235,244,241,0.92))] px-6 py-8 shadow-[0_24px_80px_rgba(18,32,39,0.12)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(207,164,101,0.10),_transparent_30%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(14,39,39,0.96))] sm:px-8 lg:px-10 lg:py-10">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,_rgba(21,103,108,0.12),_transparent_58%)] lg:block" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:items-stretch">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-teal-800 dark:border-white/10 dark:bg-white/10 dark:text-teal-200">
              <Sparkles className="h-3.5 w-3.5" />
              Professional Edition
            </div>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-extrabold leading-[0.95] tracking-[-0.06em] text-slate-950 dark:text-white sm:text-5xl lg:text-7xl">
                One product for <span className="text-teal-800 dark:text-teal-300">screening, tracking, and reporting</span> skin conditions.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
                The app combines the stronger marketing and guided workflow from `Seif.html` with your React platform:
                instant scanning, scan history, reports, and the real analysis dashboard.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['1 tap', 'to start the scan flow'],
                ['ABCDE', 'warning-pattern framing'],
                ['History', 'saved timelines and reports'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-slate-900/5 bg-white/80 p-4 dark:border-white/10 dark:bg-white/8">
                  <p className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{text}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to={primaryHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-800 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(17,94,89,0.28)] transition hover:-translate-y-0.5 hover:bg-teal-700">
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to={user || isGuest ? '/dashboard' : '/login'} className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/85 px-6 py-3.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
                Continue to the app
              </Link>
              <a href="#workflow" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/85 px-6 py-3.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
                See How It Works
              </a>
            </div>

            <p className="max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              Screening output is not a diagnosis. Painful, bleeding, fast-changing, or strongly irregular lesions should
              be reviewed by a qualified dermatologist.
            </p>
          </motion.div>

          <motion.aside initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_24px_80px_rgba(10,20,25,0.26)]">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Live product preview</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Workspace
              </span>
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.02))] p-4">
              <div className="rounded-[1.4rem] bg-[radial-gradient(circle_at_50%_30%,_rgba(255,255,255,0.12),_transparent_38%),linear-gradient(180deg,_rgba(15,78,79,0.95),_rgba(7,35,39,0.98))] p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-300">
                  <span>AI Dermatology</span>
                  <span>Preview</span>
                </div>
                <div className="relative mt-4 h-64 overflow-hidden rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.03),_rgba(255,255,255,0.01))]">
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,_rgba(255,255,255,0.03),_rgba(255,255,255,0.03)_2px,_transparent_2px,_transparent_10px)]" />
                  <div className="absolute inset-x-0 top-[-30%] h-24 animate-[pulse_2.4s_ease-in-out_infinite] bg-cyan-200/10 blur-2xl" />
                  <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300/70 shadow-[0_0_0_16px_rgba(103,232,249,0.08)]">
                    <div className="absolute inset-7 rounded-full bg-[radial-gradient(circle_at_35%_35%,_#916252,_#6c4336_58%,_#4a2b22_100%)]" />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {['Risk score', 'Top match', 'Next step'].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-white/6 p-3">
                      <p className="text-sm font-semibold">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
              <p className="text-sm font-semibold text-white">Merged direction</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Marketing-grade landing page on top of the existing product, with the strong sections restored.
              </p>
            </div>
          </motion.aside>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
        <div className="rounded-[1.75rem] border border-white/60 bg-white/80 p-6 shadow-[0_18px_50px_rgba(18,32,39,0.08)] dark:border-white/10 dark:bg-white/6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-800 dark:text-teal-300">Coverage</p>
          <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-slate-950 dark:text-white">
            Built for guided lesion screening, inflammatory pattern review, and follow-up clarity.
          </h2>
        </div>
        {highlights.map((item) => (
          <div key={item} className="rounded-[1.75rem] border border-white/60 bg-white/80 p-6 text-sm font-medium text-slate-700 shadow-[0_18px_50px_rgba(18,32,39,0.08)] dark:border-white/10 dark:bg-white/6 dark:text-slate-200">
            {item}
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div {...reveal} transition={{ duration: 0.45 }} className="rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_18px_50px_rgba(18,32,39,0.08)] dark:border-white/10 dark:bg-white/6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-800 dark:text-teal-300">Why this matters</p>
          <h2 className="mt-3 max-w-lg text-3xl font-bold tracking-[-0.05em] text-slate-950 dark:text-white sm:text-4xl">
            Stronger design is only useful if the workflow underneath is real.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
            The app presents a clearer product story while preserving the existing dashboard, guest mode, cloud upload,
            predictions, report views, and authentication flow.
          </p>
        </motion.div>

        <div className="grid gap-4">
          {benefitCards.map((item, index) => (
            <motion.article
              key={item.title}
              {...reveal}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="rounded-[1.75rem] border border-white/60 bg-white/80 p-6 shadow-[0_18px_50px_rgba(18,32,39,0.08)] dark:border-white/10 dark:bg-white/6"
            >
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.description}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-800 dark:text-teal-300">Features</p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.05em] text-slate-950 dark:text-white sm:text-4xl">
              The strong feature set is back.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            This restores the stronger value explanation that was lost in the previous cut-down version.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.article
                key={feature.title}
                {...reveal}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="rounded-[1.75rem] border border-white/60 bg-white/80 p-6 shadow-[0_18px_50px_rgba(18,32,39,0.08)] dark:border-white/10 dark:bg-white/6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{feature.description}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          {...reveal}
          transition={{ duration: 0.45 }}
          className="rounded-[2rem] border border-white/60 bg-[linear-gradient(180deg,_rgba(255,255,255,0.88),_rgba(242,248,247,0.9))] p-8 shadow-[0_18px_50px_rgba(18,32,39,0.08)] dark:border-white/10 dark:bg-[linear-gradient(180deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.03))]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-800 dark:text-teal-300">Access</p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.05em] text-slate-950 dark:text-white sm:text-4xl">
            Continue to the full app after sign in or sign up.
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">
            Registered users get the full product flow with scanning, history, reports, and the complete account-based experience.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={user || isGuest ? '/dashboard' : '/login'}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              Continue to the app
              <ArrowRight className="h-4 w-4" />
            </Link>
            {!user && !isGuest && (
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                Create account
              </Link>
            )}
          </div>
        </motion.div>

        <motion.div
          {...reveal}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="rounded-[2rem] border border-white/60 bg-[linear-gradient(135deg,_rgba(18,94,99,0.96),_rgba(9,48,51,0.98))] p-8 text-white shadow-[0_22px_60px_rgba(8,28,30,0.24)] dark:border-white/10"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Demo access</p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.05em]">
            View the full app as a one-time demo.
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/78">
            This uses guest mode and allows one demo scan so you can test the real dashboard before deciding to sign up.
          </p>
          <button
            type="button"
            onClick={handleDemoAccess}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-teal-800 transition hover:-translate-y-0.5"
          >
            Try one demo scan
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-4 text-xs leading-6 text-white/60">
            If the demo section does not fit, it can be removed cleanly without affecting the main auth flow.
          </p>
        </motion.div>
      </section>

      <section id="workflow" className="rounded-[2rem] border border-white/60 bg-white/70 p-6 shadow-[0_18px_50px_rgba(18,32,39,0.08)] dark:border-white/10 dark:bg-white/6 sm:p-8">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-800 dark:text-teal-300">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.05em] text-slate-950 dark:text-white sm:text-4xl">
              Three steps from photo to follow-up.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            The steps section is restored and tied directly to the actual scan workflow.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {workflow.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.article
                key={step.title}
                {...reveal}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="rounded-[1.75rem] border border-slate-200/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.92),_rgba(247,250,250,0.88))] p-6 dark:border-white/10 dark:bg-[linear-gradient(180deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.03))]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Step {index + 1}</p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{step.description}</p>
              </motion.article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
