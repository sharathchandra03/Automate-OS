"use client";

import { create } from "zustand";
import type { Organization, Profile } from "@/lib/types";

interface TenantState {
  org: Organization | null;
  profile: Profile | null;
  setOrg: (org: Organization) => void;
  setProfile: (p: Profile) => void;
}

export const useTenant = create<TenantState>((set) => ({
  org: null,
  profile: null,
  setOrg: (org) => set({ org }),
  setProfile: (profile) => set({ profile }),
}));
