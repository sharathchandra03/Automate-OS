import "@testing-library/jest-dom";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("next/headers", () => ({ cookies: () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }) }));
