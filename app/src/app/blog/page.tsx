"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { ArrowRight, ArrowLeft, Clock, Tag } from "lucide-react";

const POSTS = [
  {
    slug: "whatsapp-lead-generation-guide",
    category: "Marketing",
    title: "How to Generate 10X More Leads with WhatsApp Automation",
    excerpt: "Most businesses treat WhatsApp like a messaging app. The ones winning treat it like a growth engine. Here's the exact playbook we've seen generate 10x lead volume for service businesses across India.",
    author: "Arjun Mehta",
    date: "Feb 12, 2025",
    readTime: "7 min read",
    featured: true,
  },
  {
    slug: "waba-vs-whatsapp-business-app",
    category: "Guide",
    title: "WhatsApp Business API vs WhatsApp Business App: Which Should You Choose?",
    excerpt: "The regular WhatsApp Business app is free and easy to start. But it has hard limits that cap your growth. Here's exactly when you need to make the switch to WhatsApp Business API - and how to do it without losing your number.",
    author: "Neha Kapoor",
    date: "Jan 28, 2025",
    readTime: "9 min read",
    featured: false,
  },
  {
    slug: "whatsapp-template-messages-india",
    category: "Tutorial",
    title: "The Complete Guide to WhatsApp Template Messages in India",
    excerpt: "Template messages are the key to sending proactive WhatsApp notifications - for appointments, campaigns, and follow-ups. Learn how to write them, get them approved by Meta, and use them without getting flagged.",
    author: "Arjun Mehta",
    date: "Jan 14, 2025",
    readTime: "11 min read",
    featured: false,
  },
  {
    slug: "real-estate-whatsapp-automation",
    category: "Case Study",
    title: "How Real Estate Agents Are Booking 3X More Appointments with WhatsApp",
    excerpt: "Property inquiries happen fast. A lead who doesn't hear back in 5 minutes moves on to the next agent. Here's how top real estate teams across Mumbai, Pune, and Hyderabad are using WhatsApp automation to respond instantly and close faster.",
    author: "Priya Nair",
    date: "Jan 7, 2025",
    readTime: "6 min read",
    featured: false,
  },
  {
    slug: "whatsapp-chatbot-clinic-setup",
    category: "Tutorial",
    title: "Setting Up a WhatsApp Chatbot for Your Clinic in 30 Minutes",
    excerpt: "Patients call and message at all hours. A WhatsApp chatbot can handle appointment bookings, FAQs, and prescription reminders automatically - no staff required outside working hours. Here's the step-by-step setup for clinics and healthcare practices.",
    author: "Dr. Sanjay Verma",
    date: "Dec 20, 2024",
    readTime: "8 min read",
    featured: false,
  },
  {
    slug: "whatsapp-automation-industries-2025",
    category: "Industry Insight",
    title: "India's Top 5 Industries Using WhatsApp Automation in 2025",
    excerpt: "From real estate to e-commerce to healthcare - WhatsApp automation has become the secret weapon of India's fastest-growing businesses. Here's how five industries are using it differently, and what results they're seeing.",
    author: "Neha Kapoor",
    date: "Feb 3, 2025",
    readTime: "5 min read",
    featured: false,
  },
];

const CATEGORIES = ["All", "Marketing", "Guide", "Tutorial", "Case Study", "Industry Insight"];

const CATEGORY_COLORS: Record<string, string> = {
  Marketing:        "bg-blue-100 text-blue-700",
  Guide:            "bg-violet-100 text-violet-700",
  Tutorial:         "bg-emerald-100 text-emerald-700",
  "Case Study":     "bg-amber-100 text-amber-700",
  "Industry Insight": "bg-rose-100 text-rose-700",
};

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All" ? POSTS : POSTS.filter((p) => p.category === activeCategory);
  const [featured, ...rest] = filtered;

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/"><Logo /></Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
            <Link href="/signup" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
              Start Free Trial <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-14 max-w-6xl">

        {/* Page title */}
        <div className="text-center mb-12">
          <p className="text-xs font-bold text-primary tracking-widest uppercase mb-3">The AutomateOS Blog</p>
          <h1 className="text-4xl font-bold tracking-tight">WhatsApp Automation Insights</h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Guides, case studies, and playbooks to help Indian businesses grow faster with WhatsApp automation.
          </p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">No posts in this category yet.</div>
        )}

        {/* Featured post */}
        {featured && (
          <div className="mb-8 rounded-2xl border border-border bg-card overflow-hidden hover:shadow-elevated transition-all duration-200 cursor-pointer group">
            <div className="md:flex">
              <div className="md:w-1/2 bg-gradient-to-br from-primary/10 via-accent to-primary/5 flex items-center justify-center min-h-[200px] md:min-h-[260px]">
                <div className="text-center p-8">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${CATEGORY_COLORS[featured.category] ?? "bg-secondary text-muted-foreground"}`}>
                    {featured.category}
                  </span>
                  <p className="mt-4 text-4xl font-black text-primary/20">01</p>
                </div>
              </div>
              <div className="md:w-1/2 p-8 flex flex-col justify-between">
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 ${CATEGORY_COLORS[featured.category] ?? "bg-secondary text-muted-foreground"}`}>
                    {featured.category}
                  </span>
                  <h2 className="text-2xl font-bold leading-tight group-hover:text-primary transition-colors">{featured.title}</h2>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{featured.excerpt}</p>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {featured.author.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{featured.author}</p>
                      <p className="text-xs text-muted-foreground">{featured.date}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {featured.readTime}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rest of posts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rest.map((post) => (
            <article key={post.slug} className="rounded-2xl border border-border bg-card p-6 flex flex-col hover:shadow-elevated hover:border-primary/20 transition-all duration-200 cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${CATEGORY_COLORS[post.category] ?? "bg-secondary text-muted-foreground"}`}>
                  {post.category}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {post.readTime}
                </span>
              </div>
              <h3 className="font-bold text-base leading-snug group-hover:text-primary transition-colors flex-1">{post.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">{post.excerpt}</p>
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {post.author.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{post.author}</p>
                  <p className="text-xs text-muted-foreground">{post.date}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Newsletter CTA */}
        <div className="mt-16 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent p-10 text-center">
          <Tag className="h-8 w-8 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Get the Latest Insights in Your Inbox</h2>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto text-sm">
            Join 2,000+ Indian business owners who get actionable WhatsApp growth tips every week.
          </p>
          <form className="mt-6 flex gap-2 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              required
              placeholder="you@company.com"
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
            <button type="submit" className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer flex-shrink-0">
              Subscribe
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="container py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Logo />
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AutomateOS. All rights reserved.</p>
          <Link href="/" className="text-xs text-primary hover:underline">← Back to Home</Link>
        </div>
      </footer>
    </div>
  );
}
