import { describe, expect, it } from "vitest";
import { isOffensive } from "@/lib/social/clean";

describe("name filter", () => {
  it("lets real names through", () => {
    for (const n of ["Yamashita", "Matsushita", "Kinoshita", "Shital", "Rashita", "Wankhede", "Nazir", "Nazia", "Nazim",
      "Arthur Evans", "Thurein", "Caputo", "Porras", "Pornchai", "Kikelomo", "Penistone", "Scunthorpe", "Shitake",
      "Merdeka", "Dickens", "Sussex", "Essex", "Hancock", "Sexton", "Fagan", "Sikander", "Skillful", "Grapes", "Peacock"]) {
      expect(isOffensive(n), n).toBe(false);
    }
  });
  it("catches plain abuse, however it is spelled", () => {
    for (const n of ["fuck", "FuCk3r", "shit", "s.h.i.t", "big_cock", "nazi", "b1tch", "assh0le", "kill me", "n1gger"]) {
      expect(isOffensive(n), n).toBe(true);
    }
  });
});
