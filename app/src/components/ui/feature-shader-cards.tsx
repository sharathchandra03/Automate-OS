"use client";

import type React from "react";
import { Warp } from "@paper-design/shaders-react";

interface Feature {
  title: string;
  desc: string;
  icon: React.ElementType;
}

interface FeatureShaderCardsProps {
  features: Feature[];
}

const SHADER_CONFIGS = [
  {
    proportion: 0.3,
    softness: 0.8,
    distortion: 0.15,
    swirl: 0.6,
    swirlIterations: 8,
    shape: "checks" as const,
    shapeScale: 0.08,
    colors: ["hsl(240, 80%, 25%)", "hsl(260, 90%, 55%)", "hsl(280, 100%, 40%)", "hsl(250, 100%, 65%)"],
  },
  {
    proportion: 0.4,
    softness: 1.2,
    distortion: 0.2,
    swirl: 0.9,
    swirlIterations: 12,
    shape: "stripes" as const,
    shapeScale: 0.12,
    colors: ["hsl(200, 100%, 25%)", "hsl(220, 90%, 55%)", "hsl(190, 80%, 35%)", "hsl(210, 100%, 65%)"],
  },
  {
    proportion: 0.35,
    softness: 0.9,
    distortion: 0.18,
    swirl: 0.7,
    swirlIterations: 10,
    shape: "checks" as const,
    shapeScale: 0.1,
    colors: ["hsl(270, 90%, 28%)", "hsl(290, 100%, 58%)", "hsl(260, 80%, 35%)", "hsl(280, 90%, 70%)"],
  },
  {
    proportion: 0.45,
    softness: 1.1,
    distortion: 0.22,
    swirl: 0.8,
    swirlIterations: 15,
    shape: "stripes" as const,
    shapeScale: 0.09,
    colors: ["hsl(160, 80%, 22%)", "hsl(180, 90%, 50%)", "hsl(150, 70%, 30%)", "hsl(170, 100%, 60%)"],
  },
  {
    proportion: 0.38,
    softness: 0.95,
    distortion: 0.16,
    swirl: 0.85,
    swirlIterations: 11,
    shape: "checks" as const,
    shapeScale: 0.11,
    colors: ["hsl(30, 90%, 28%)", "hsl(45, 100%, 55%)", "hsl(20, 80%, 35%)", "hsl(40, 100%, 68%)"],
  },
  {
    proportion: 0.42,
    softness: 1.0,
    distortion: 0.19,
    swirl: 0.75,
    swirlIterations: 9,
    shape: "stripes" as const,
    shapeScale: 0.13,
    colors: ["hsl(330, 90%, 28%)", "hsl(350, 100%, 55%)", "hsl(315, 80%, 35%)", "hsl(340, 100%, 68%)"],
  },
  {
    proportion: 0.33,
    softness: 0.85,
    distortion: 0.17,
    swirl: 0.65,
    swirlIterations: 10,
    shape: "checks" as const,
    shapeScale: 0.09,
    colors: ["hsl(230, 85%, 25%)", "hsl(210, 100%, 58%)", "hsl(245, 90%, 32%)", "hsl(220, 95%, 68%)"],
  },
  {
    proportion: 0.44,
    softness: 1.05,
    distortion: 0.21,
    swirl: 0.88,
    swirlIterations: 13,
    shape: "stripes" as const,
    shapeScale: 0.1,
    colors: ["hsl(170, 80%, 22%)", "hsl(195, 95%, 52%)", "hsl(155, 75%, 30%)", "hsl(180, 90%, 62%)"],
  },
];

export function FeatureShaderCards({ features }: FeatureShaderCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {features.map((feature, index) => {
        const cfg = SHADER_CONFIGS[index % SHADER_CONFIGS.length];
        const Icon = feature.icon;

        return (
          <div key={feature.title} className="relative h-72">
            {/* Shader background */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <Warp
                style={{ height: "100%", width: "100%" }}
                proportion={cfg.proportion}
                softness={cfg.softness}
                distortion={cfg.distortion}
                swirl={cfg.swirl}
                swirlIterations={cfg.swirlIterations}
                shape={cfg.shape}
                shapeScale={cfg.shapeScale}
                scale={1}
                rotation={0}
                speed={0.7}
                colors={cfg.colors}
              />
            </div>

            {/* Card content overlay */}
            <div className="relative z-10 p-6 rounded-2xl h-full flex flex-col bg-black/75 border border-white/15 backdrop-blur-sm hover:bg-black/65 transition-colors duration-200">
              <div className="mb-4 w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Icon className="h-5 w-5 text-white" />
              </div>

              <h3 className="text-base font-bold text-white mb-2 leading-snug">{feature.title}</h3>

              <p className="text-xs text-gray-200 leading-relaxed flex-1">{feature.desc}</p>

              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white transition-colors cursor-pointer">
                <span>Learn more</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
