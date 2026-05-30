"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { FeatureShaderCards } from "@/components/ui/feature-shader-cards";
import {
  ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Menu, X,
  MessageCircle, Zap, Users, Bot, CalendarCheck, LifeBuoy,
  Megaphone, BarChart3, Repeat, Shield, Globe, Star,
} from "lucide-react";

// ── Data ─────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: "Starter",
    monthly: 1499,
    annual: 1199,
    description: "Perfect for small businesses and solopreneurs getting started with WhatsApp automation.",
    popular: false,
    features: [
      "1 WhatsApp Number (BYOC)",
      "Up to 3 agents",
      "10,000 messages / month",
      "5,000 contacts",
      "Visual Flow Builder",
      "Broadcast Campaigns",
      "Appointment Booking",
      "Basic Analytics",
      "Email Support",
    ],
  },
  {
    name: "Growth",
    monthly: 3999,
    annual: 3199,
    description: "For growing teams who need advanced automation and analytics to scale faster.",
    popular: true,
    features: [
      "3 WhatsApp Numbers",
      "Up to 15 agents",
      "50,000 messages / month",
      "25,000 contacts",
      "Everything in Starter",
      "Drip Sequences & Follow-ups",
      "Ticket Management + SLA",
      "API Access & Webhooks",
      "Full Analytics & Reports",
      "Priority Chat Support",
    ],
  },
  {
    name: "Scale",
    monthly: 8999,
    annual: 7199,
    description: "Built for large businesses and agencies managing multiple WhatsApp numbers at scale.",
    popular: false,
    features: [
      "Unlimited WhatsApp Numbers",
      "Unlimited agents",
      "2,00,000 messages / month",
      "Unlimited contacts",
      "Everything in Growth",
      "White-label branding option",
      "Custom Integrations",
      "Dedicated Account Manager",
      "24 / 7 Priority Support",
    ],
  },
];

const FEATURES = [
  { icon: Bot,            title: "Visual Flow Builder",     desc: "Build powerful WhatsApp chatbots without writing a single line of code. Drag nodes, set conditions, and launch conversational flows that handle bookings, FAQs, and lead qualification on autopilot - 24 hours a day." },
  { icon: Megaphone,      title: "WhatsApp Campaigns",      desc: "Send personalised broadcast messages to thousands of contacts with one click. Segment by tags, custom fields, or purchase behaviour. Track delivery, read rates, and replies in real-time." },
  { icon: MessageCircle,  title: "Smart Unified Inbox",     desc: "Every customer conversation in one clean inbox. Assign to the right agent, add private notes for context, and set follow-up reminders - so nothing ever slips through the cracks." },
  { icon: Users,          title: "Contact CRM",             desc: "Import, organise, and segment your entire contact base. Add unlimited custom fields, track opt-in history, and build smart lists for precision outreach every time." },
  { icon: CalendarCheck,  title: "Appointment Booking",     desc: "Let customers book appointments directly over WhatsApp. Automated reminders 24h and 1h before each slot reduce no-shows by up to 70% - without a single manual follow-up." },
  { icon: LifeBuoy,       title: "Ticket Management + SLA", desc: "Convert WhatsApp conversations into tracked support tickets in seconds. Set priority levels, assign SLA timers, and receive breach alerts before a customer is ever left waiting." },
  { icon: Repeat,         title: "Drip Sequences",          desc: "Schedule a series of perfectly timed WhatsApp messages that run on autopilot over days or weeks. Nurture cold leads into warm prospects without lifting a finger." },
  { icon: BarChart3,      title: "Real-time Analytics",     desc: "See exactly what is working at a glance. Campaign delivery rates, bot flow completions, agent response times, and full conversion funnels - all live, all in one dashboard." },
];

const FAQS = [
  { q: "Do I need to apply for WhatsApp Business API separately?", a: "No. AutomateOS is a BYOC (Bring Your Own Credentials) platform. You connect your existing WhatsApp Business API credentials, or we guide you through getting approved - a one-time process that typically takes 2–3 business days." },
  { q: "Can I use my existing WhatsApp Business number?", a: "Yes, if your number is already on WhatsApp Business API (Meta WABA), you can connect it directly. If it's on the regular WhatsApp Business app, you'll need to migrate it to WABA - we provide step-by-step guidance at no extra cost." },
  { q: "Will my number get banned for sending bulk messages?", a: "Not if you follow Meta's policies - and AutomateOS enforces every one of them automatically. We only send to opted-in contacts, use Meta-approved templates for outbound messages, and respect daily sending limits. We've managed millions of messages without a single ban." },
  { q: "How many messages can I send per day?", a: "Daily limits depend on your Meta Business Verification tier - starting at 1,000 unique contacts per day and scaling to unlimited once you're fully verified. AutomateOS automatically manages these limits to keep your account healthy at all times." },
  { q: "Can multiple agents handle conversations from one WhatsApp number?", a: "Absolutely. That's one of AutomateOS's core strengths. Add as many agents as your plan allows, assign conversations intelligently, set availability, and collaborate with private internal notes - all from one shared WhatsApp number." },
  { q: "What payment methods do you accept?", a: "We use Razorpay for all payments. You can pay via UPI (GPay, PhonePe, Paytm), credit/debit cards, net banking, or EMI. All transactions are processed in Indian Rupees with a secure, PCI-DSS-compliant gateway." },
  { q: "Is there a free trial?", a: "Yes! Every new account gets a 14-day free trial on the Growth plan - no credit card required. Explore all features, connect your WhatsApp number, and see real results before choosing a plan." },
  { q: "Can I cancel my subscription at any time?", a: "Yes. Cancel anytime directly from your billing settings. Your access continues until the end of the paid period and we never charge a cancellation fee. No questions asked." },
  { q: "Do you support Hindi or regional language messages?", a: "WhatsApp supports full Unicode, so you can send messages in any Indian language - Hindi, Tamil, Telugu, Marathi, Kannada, Bengali, and more. Template messages must be approved by Meta in the respective language, which we help you set up." },
  { q: "Is my customer data stored securely?", a: "Your data is stored on encrypted, SOC 2-compliant infrastructure. All WhatsApp credentials are AES-256-GCM encrypted at rest. We never share your data with third parties, and our platform is designed to be fully GDPR-ready and compliant with India's DPDP Act." },
];

const TESTIMONIALS = [
  { name: "Rajesh Kumar", role: "Director, PropMaxx Realty", city: "Mumbai", avatar: "RK", rating: 5, text: "We went from manually handling 50 leads a day to 300+ using AutomateOS. Our appointment booking rate tripled in the first month. The ROI was visible in week one - this tool pays for itself many times over." },
  { name: "Priya Sharma",  role: "Operations Head, HealWell Clinic", city: "Bengaluru", avatar: "PS", rating: 5, text: "The chatbot handles 70% of our patient queries automatically. Our front desk staff can now focus on actual care instead of answering the same questions all day. Patient satisfaction scores went up immediately." },
  { name: "Amit Patel",   role: "Founder, StyleHub", city: "Ahmedabad", avatar: "AP", rating: 5, text: "We send personalised WhatsApp offers to 20,000 customers every week. Read rates are consistently above 45% - that's 10x better than email. AutomateOS paid for itself in the very first campaign we ran." },
];

// ── Landing Page ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [annual, setAnnual]         = useState(false);
  const [openFaq, setOpenFaq]       = useState<number | null>(null);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [scrolled, setScrolled]     = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-soft" : "bg-transparent"}`}>
        <div className="container flex h-16 items-center justify-between">
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            {([["home","Home"],["features","Features"],["pricing","Pricing"]] as [string,string][]).map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">{label}</button>
            ))}
            <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
            <button onClick={() => scrollTo("contact")} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Contact Us</button>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors">Login</Link>
            <Link href="/signup" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
              Register <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-secondary cursor-pointer" aria-label="Menu">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
            <nav className="container flex flex-col py-4 gap-1">
              {([["home","Home"],["features","Features"],["pricing","Pricing"]] as [string,string][]).map(([id, label]) => (
                <button key={id} onClick={() => scrollTo(id)} className="text-left px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer">{label}</button>
              ))}
              <Link href="/blog" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">Blog</Link>
              <button onClick={() => scrollTo("contact")} className="text-left px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer">Contact Us</button>
              <div className="flex gap-2 mt-2 pt-2 border-t border-border">
                <Link href="/login" className="flex-1 text-center py-2.5 text-sm font-medium border border-border rounded-xl hover:bg-secondary transition-colors">Login</Link>
                <Link href="/signup" className="flex-1 text-center py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity">Register</Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ══ HERO ════════════════════════════════════════════════════════════ */}
      <section id="home" className="relative pt-28 pb-20 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-[600px] h-[600px] bg-primary/6 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -right-24 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl" />
        </div>

        <div className="container relative">
          <div className="flex flex-col lg:flex-row items-center gap-16">

            {/* Left copy */}
            <div className="flex-1 text-center lg:text-left max-w-2xl mx-auto lg:mx-0 lg:pl-10 xl:pl-16">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                India&apos;s #1 WhatsApp Business Automation Platform
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold leading-tight tracking-tight text-balance">
                Run Your Entire Business on{" "}
                <span className="bg-gradient-to-r from-primary via-violet-500 to-indigo-600 bg-clip-text text-transparent">
                  WhatsApp
                </span>
                {" "} Without the Chaos
              </h1>

              <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                AutomateOS is the complete WhatsApp automation platform for growing Indian businesses. Chatbots, campaigns, CRM, bookings, and support - one dashboard, zero complexity, unlimited growth.
              </p>

              <div className="mt-8 flex flex-wrap gap-3 justify-center lg:justify-start">
                <Link href="/signup" className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-primary/20">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Link>
                <button onClick={() => scrollTo("features")} className="inline-flex items-center gap-2 px-7 py-3.5 border border-border bg-background rounded-xl font-semibold text-sm hover:bg-secondary transition-all cursor-pointer">
                  Explore Features
                </button>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 justify-center lg:justify-start text-sm text-muted-foreground">
                {["14-day free trial", "No credit card needed", "Setup in 5 minutes", "Cancel anytime"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Dashboard mockup */}
            <div className="flex-1 w-full max-w-lg">
              <div className="relative rounded-2xl border border-border shadow-2xl overflow-hidden bg-card animate-float">
                {/* Window chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <div className="flex-1 mx-3 h-5 rounded bg-border/60" />
                  <div className="w-6 h-6 rounded-full bg-primary/20" />
                </div>
                <div className="flex">
                  {/* Mini sidebar */}
                  <div className="w-14 border-r border-border bg-secondary/20 p-2 flex flex-col gap-2 py-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className={`h-8 rounded-lg ${i === 1 ? "bg-primary/20" : "bg-border/40"}`} />
                    ))}
                  </div>
                  {/* Content */}
                  <div className="flex-1 p-4 space-y-3">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      {[["156", "Leads Today"], ["24", "Campaigns"], ["89%", "Open Rate"]].map(([v, l]) => (
                        <div key={l} className="rounded-xl bg-secondary/60 p-3 text-center">
                          <p className="text-base font-bold text-primary">{v}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">{l}</p>
                        </div>
                      ))}
                    </div>
                    {/* Chat */}
                    <div className="rounded-xl bg-secondary/30 p-3 space-y-2">
                      <p className="text-[10px] font-semibold text-muted-foreground">Live Conversation</p>
                      <div className="space-y-1.5">
                        <div className="max-w-[75%] rounded-xl rounded-tl-sm bg-border/60 px-3 py-2">
                          <p className="text-[9px]">Hi! I&apos;d like to book an appointment</p>
                        </div>
                        <div className="ml-auto max-w-[75%] rounded-xl rounded-tr-sm bg-primary/15 px-3 py-2">
                          <p className="text-[9px] text-primary">Sure! What date works for you?</p>
                        </div>
                        <div className="max-w-[75%] rounded-xl rounded-tl-sm bg-border/60 px-3 py-2">
                          <p className="text-[9px]">Tomorrow at 3 PM please</p>
                        </div>
                        <div className="ml-auto max-w-[80%] rounded-xl rounded-tr-sm bg-primary/15 px-3 py-2">
                          <p className="text-[9px] text-primary">Booked! You&apos;ll get a reminder 1h before.</p>
                        </div>
                      </div>
                    </div>
                    {/* Campaign bar */}
                    <div className="rounded-xl border border-border p-3 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-success/15 flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-semibold">Diwali Sale Campaign</p>
                        <div className="mt-1.5 h-1.5 rounded-full bg-border">
                          <div className="h-1.5 rounded-full bg-success" style={{ width: "68%" }} />
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground flex-shrink-0">68% sent</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ STATS ═══════════════════════════════════════════════════════════ */}
      <section className="border-y border-border bg-secondary/30">
        <div className="container py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[["500+","Businesses Powered"],["10M+","Messages Delivered"],["40%","Avg. Read Rate"],["< 5 min","Setup Time"]].map(([v,l]) => (
              <div key={l}>
                <p className="text-3xl font-black text-foreground">{v}</p>
                <p className="text-sm text-muted-foreground mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ════════════════════════════════════════════════════════ */}
      <section id="features" className="py-24">
        <div className="container">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-primary tracking-widest uppercase">Platform Features</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
              Everything Your Business Needs.<br className="hidden sm:block" /> Right Inside WhatsApp.
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-base leading-relaxed">
              Stop duct-taping six tools together and paying for all of them. AutomateOS ships every capability a service business needs - from the very first message to the closed deal.
            </p>
          </div>

          <FeatureShaderCards features={FEATURES} />
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════════════════════ */}
      <section className="py-20 border-t border-border bg-secondary/20">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-primary tracking-widest uppercase">Getting Started</p>
            <h2 className="mt-3 text-3xl font-bold">Live in Under 5 Minutes</h2>
            <p className="mt-3 text-muted-foreground">No developer. No agency. Just you and your business.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Register & Connect Your WhatsApp", desc: "Sign up as a vendor, enter your Meta WABA credentials, and connect your WhatsApp number. Our guided wizard walks you through every single step - including getting Meta approval if you need it." },
              { step: "02", title: "Build Your Automations",           desc: "Use the drag-and-drop flow builder to create chatbots in minutes. Set up broadcast campaigns, appointment reminders, drip sequences, and follow-up templates - all from a single intuitive interface." },
              { step: "03", title: "Watch It Run - You Close Deals",   desc: "Your automations work 24/7 without you. Leads are qualified, appointments are booked, and customers get instant replies. You focus on strategy. AutomateOS handles the execution." },
            ].map((s, i) => (
              <div key={s.step} className="relative rounded-2xl border border-border bg-card p-7">
                <span className="text-6xl font-black text-primary/8 leading-none">{s.step}</span>
                <h3 className="mt-2 text-base font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                {i < 2 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-background border border-border items-center justify-center">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ═════════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-24">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-primary tracking-widest uppercase">Pricing</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">Simple Pricing for Indian Businesses</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              All plans include a 14-day free trial. No credit card required. Secure payments via{" "}
              <span className="font-semibold text-foreground">Razorpay</span> - pay with UPI, cards, or net banking in ₹.
            </p>

            {/* Toggle */}
            <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-border p-1 bg-secondary/50">
              <button onClick={() => setAnnual(false)} className={`px-6 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${!annual ? "bg-background shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Monthly</button>
              <button onClick={() => setAnnual(true)}  className={`px-6 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${annual  ? "bg-background shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Annual <span className="ml-1.5 text-xs font-bold text-success">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`relative rounded-2xl border-2 p-7 flex flex-col ${plan.popular ? "border-primary bg-gradient-to-br from-primary/5 via-card to-accent shadow-elevated" : "border-border bg-card"}`}>
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/20">Most Popular</span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="text-4xl font-black">₹{(annual ? plan.annual : plan.monthly).toLocaleString("en-IN")}</span>
                    <span className="text-muted-foreground mb-1.5 text-sm">/mo</span>
                  </div>
                  {annual && (
                    <p className="text-xs text-success font-medium mt-1">
                      Billed ₹{(plan.annual * 12).toLocaleString("en-IN")}/yr - Save ₹{((plan.monthly - plan.annual) * 12).toLocaleString("en-IN")}
                    </p>
                  )}
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{plan.description}</p>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/signup" className={`w-full text-center py-3 rounded-xl text-sm font-semibold transition-all ${plan.popular ? "bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/20" : "border border-border hover:bg-secondary"}`}>
                  Start 14-day Free Trial
                </Link>
              </div>
            ))}
          </div>

          {/* Enterprise strip */}
          <div className="mt-6 max-w-5xl mx-auto rounded-2xl border border-border bg-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base">Enterprise</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Custom volumes · On-premise · Dedicated infrastructure · Custom SLAs · White-label branding</p>
            </div>
            <button onClick={() => scrollTo("contact")} className="flex-shrink-0 px-6 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-secondary transition-colors cursor-pointer">
              Contact Sales
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> All payments secured by Razorpay · PCI-DSS compliant · GST invoice included
          </p>
        </div>
      </section>

      {/* ══ TESTIMONIALS ════════════════════════════════════════════════════ */}
      <section className="py-20 border-t border-border bg-secondary/20">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-primary tracking-widest uppercase">Customer Stories</p>
            <h2 className="mt-3 text-3xl font-bold">Trusted by Growing Indian Businesses</h2>
            <p className="mt-3 text-muted-foreground">Real stories from real customers who scaled with WhatsApp automation.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl border border-border bg-card p-6 flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(t.rating)].map((_, i) => <Star key={i} className="h-4 w-4 fill-warning text-warning" />)}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed italic flex-1">&ldquo;{t.text}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center flex-shrink-0">{t.avatar}</div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role} · {t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ INDUSTRIES ══════════════════════════════════════════════════════ */}
      <section className="py-14 border-t border-border">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground font-medium">Works for every service industry - plug in and go live</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["Real Estate","Clinics & Hospitals","Coaching & Education","Marketing Agencies","E-commerce","Salons & Spas","Gyms & Fitness","Consultancies","SaaS Companies","Local Businesses","Restaurants","Law Firms"].map((p) => (
              <span key={p} className="px-3.5 py-1.5 rounded-full border border-border bg-secondary/50 text-sm text-muted-foreground">{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ═════════════════════════════════════════════════════════════ */}
      <section className="py-24 border-t border-border">
        <div className="container max-w-3xl">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-primary tracking-widest uppercase">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold">Questions We Get Asked All the Time</h2>
            <p className="mt-3 text-muted-foreground">Everything you need to know before signing up. If your question isn&apos;t here, reach out - we&apos;re happy to help.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-secondary/50 transition-colors gap-4">
                  <span className="font-medium text-sm">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CONTACT ═════════════════════════════════════════════════════════ */}
      <section id="contact" className="py-20 border-t border-border bg-secondary/20">
        <div className="container max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-xs font-bold text-primary tracking-widest uppercase">Contact Us</p>
              <h2 className="mt-3 text-3xl font-bold">Let&apos;s Talk About Your Business</h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Have questions before signing up? Want to explore Enterprise options? Need a product demo? Our team responds within 2 business hours.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  { icon: MessageCircle, label: "WhatsApp Us",  val: "+91 98765 43210" },
                  { icon: Globe,         label: "Email Us",     val: "hello@automateos.in" },
                ].map((c) => {
                  const Icon = c.icon;
                  return (
                    <div key={c.label} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><Icon className="h-5 w-5 text-primary" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground">{c.label}</p>
                        <p className="font-medium text-sm">{c.val}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ═══════════════════════════════════════════════════════ */}
      <section className="py-24 border-t border-border">
        <div className="container text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-6">
            <Zap className="h-3 w-3" /> 14-day free trial · No credit card needed
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight max-w-2xl mx-auto text-balance">
            Your Competitors Are Already Using WhatsApp Automation. Are You?
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Join 500+ businesses using AutomateOS to generate leads, book appointments, and delight customers - on autopilot, around the clock.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-primary/20">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
            <button onClick={() => scrollTo("pricing")} className="inline-flex items-center gap-2 px-7 py-3.5 border border-border rounded-xl font-semibold text-sm hover:bg-secondary transition-all cursor-pointer">
              View Pricing
            </button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer className="border-t border-border bg-secondary/30">
        <div className="container py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <Logo />
              <p className="mt-3 text-sm text-muted-foreground max-w-xs leading-relaxed">
                The complete WhatsApp automation platform for growing Indian businesses. Built with love in India.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" /><span>Payments secured by Razorpay</span>
              </div>
            </div>
            {[
              { label: "Product",  links: ["Features", "Pricing", "Blog", "Changelog", "Roadmap"] },
              { label: "Company",  links: ["About Us", "Careers", "Contact", "Partners"] },
              { label: "Legal",    links: ["Privacy Policy", "Terms of Service", "Refund Policy", "DPDP Compliance"] },
            ].map((col) => (
              <div key={col.label}>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{col.label}</p>
                <ul className="space-y-2">
                  {col.links.map((l) => <li key={l}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} AutomateOS. All rights reserved.</p>
            <p>Made with care for Indian businesses 🇮🇳</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

// ── Contact Form ──────────────────────────────────────────────────────────────

function ContactForm() {
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1400);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-success/20 bg-success/5 p-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
        <h3 className="font-bold text-lg">Message Sent!</h3>
        <p className="text-sm text-muted-foreground mt-1">We&apos;ll be in touch within 2 business hours.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="c-name" className="block text-sm font-medium mb-1.5">Name</label>
          <input id="c-name" required placeholder="Your name" className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />
        </div>
        <div>
          <label htmlFor="c-phone" className="block text-sm font-medium mb-1.5">Phone</label>
          <input id="c-phone" placeholder="919876543210" className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />
        </div>
      </div>
      <div>
        <label htmlFor="c-email" className="block text-sm font-medium mb-1.5">Email</label>
        <input id="c-email" type="email" required placeholder="you@company.com" className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors" />
      </div>
      <div>
        <label htmlFor="c-msg" className="block text-sm font-medium mb-1.5">Message</label>
        <textarea id="c-msg" required rows={4} placeholder="Tell us about your business and what you're looking to automate..." className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none" />
      </div>
      <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer">
        {loading ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
