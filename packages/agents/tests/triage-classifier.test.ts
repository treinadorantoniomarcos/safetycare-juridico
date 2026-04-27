import { describe, expect, it } from "vitest";
import { classifyCaseTriage } from "../src";

describe("classifyCaseTriage", () => {
  it("detects health plan cases with high legal potential", () => {
    const result = classifyCaseTriage({
      source: "whatsapp",
      message: "Meu plano negou a cobertura da cirurgia e tenho laudo e exames."
    });

    expect(result.caseType).toBe("health_plan");
    expect(result.legalPotential).toBe("medium");
  });

  it("marks severe hospital narratives as high urgency", () => {
    const result = classifyCaseTriage({
      source: "form",
      message: "Minha mae ficou na UTI e piorou apos a alta do hospital."
    });

    expect(result.caseType).toBe("hospital_failure");
    expect(result.urgency).toBe("critical");
    expect(result.hasDamage).toBe(true);
  });
});
