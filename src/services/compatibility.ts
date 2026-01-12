/**
 * Compatibility Service
 *
 * Handles compatibility checking between products.
 */

import type { Env, CompatibilityCheck } from '../types';

interface ProductRecord {
  id: string;
  name: string;
  category: string;
  specs: string | Record<string, string | number>;
  compatibility_tags: string | string[];
}

interface ParsedProduct {
  id: string;
  name: string;
  category: string;
  specs: Record<string, string | number>;
  compatibilityTags: string[];
}

/**
 * Check compatibility between products
 */
export async function checkCompatibility(
  products: ProductRecord[],
  _env: Env
): Promise<CompatibilityCheck> {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Parse specs and tags
  const parsedProducts: ParsedProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    specs: typeof p.specs === 'string' ? JSON.parse(p.specs) : p.specs,
    compatibilityTags: typeof p.compatibility_tags === 'string'
      ? JSON.parse(p.compatibility_tags)
      : p.compatibility_tags,
  }));

  // Find components by category
  const cpu = parsedProducts.find((p) => p.category === 'CPU');
  const motherboard = parsedProducts.find((p) => p.category === 'Motherboard');
  const ram = parsedProducts.find((p) => p.category === 'RAM');
  const gpu = parsedProducts.find((p) => p.category === 'GPU');
  const psu = parsedProducts.find((p) => p.category === 'PSU');
  const cpuCooler = parsedProducts.find((p) => p.category === 'CPU Cooler');
  const pcCase = parsedProducts.find((p) => p.category === 'Case');

  // CPU-Motherboard Socket compatibility
  if (cpu && motherboard) {
    const cpuSocket = cpu.specs?.socket;
    const mbSocket = motherboard.specs?.socket;

    if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
      issues.push(
        `CPU socket (${cpuSocket}) incompatible with motherboard socket (${mbSocket})`
      );
    }
  }

  // RAM-Motherboard compatibility
  if (ram && motherboard) {
    const ramType = ram.specs?.type;
    const mbRamType = motherboard.specs?.ramType;

    if (ramType && mbRamType && ramType !== mbRamType) {
      issues.push(
        `RAM type (${ramType}) incompatible with motherboard (${mbRamType})`
      );
    }

    // Check RAM slots
    const ramSlots = motherboard.specs?.ramSlots;
    if (ramSlots && parsedProducts.filter((p) => p.category === 'RAM').length > Number(ramSlots)) {
      issues.push(
        `Too many RAM modules for available motherboard slots (${ramSlots})`
      );
    }
  }

  // Power requirements
  if (psu) {
    const psuWattage = Number(psu.specs?.wattage || 0);
    let estimatedTdp = 0;

    if (cpu) {
      estimatedTdp += Number(cpu.specs?.tdp || 65);
    }
    if (gpu) {
      estimatedTdp += Number(gpu.specs?.tdp || 150);
    }

    // Add buffer for other components
    estimatedTdp += 100;

    const recommendedWattage = Math.ceil(estimatedTdp * 1.2);

    if (psuWattage > 0 && psuWattage < recommendedWattage) {
      suggestions.push(
        `Consider a higher wattage PSU. Estimated need: ${recommendedWattage}W, current: ${psuWattage}W`
      );
    }
  }

  // GPU-Case clearance
  if (gpu && pcCase) {
    const gpuLength = Number(gpu.specs?.length || 0);
    const caseGpuClearance = Number(pcCase.specs?.gpuClearance || 0);

    if (gpuLength > 0 && caseGpuClearance > 0 && gpuLength > caseGpuClearance) {
      issues.push(
        `GPU length (${gpuLength}mm) exceeds case GPU clearance (${caseGpuClearance}mm)`
      );
    }
  }

  // CPU Cooler-Case clearance
  if (cpuCooler && pcCase) {
    const coolerHeight = Number(cpuCooler.specs?.height || 0);
    const caseCoolerClearance = Number(pcCase.specs?.coolerClearance || 0);

    if (coolerHeight > 0 && caseCoolerClearance > 0 && coolerHeight > caseCoolerClearance) {
      issues.push(
        `CPU cooler height (${coolerHeight}mm) exceeds case CPU cooler clearance (${caseCoolerClearance}mm)`
      );
    }
  }

  // CPU Cooler-CPU socket compatibility
  if (cpuCooler && cpu) {
    const coolerSockets = cpuCooler.compatibilityTags || [];
    const cpuSocket = cpu.specs?.socket;

    if (cpuSocket && coolerSockets.length > 0) {
      const socketCompatible = coolerSockets.some(
        (tag) => tag.toLowerCase().includes(String(cpuSocket).toLowerCase())
      );

      if (!socketCompatible) {
        issues.push(
          `CPU cooler may not be compatible with ${cpuSocket} socket. Check cooler specifications.`
        );
      }
    }
  }

  // Add general suggestions
  if (!psu && (cpu || gpu)) {
    suggestions.push('Remember to include a power supply unit (PSU) in your build');
  }

  if (!cpuCooler && cpu) {
    suggestions.push('Consider adding a CPU cooler for better thermal performance');
  }

  if (!ram && motherboard) {
    suggestions.push('Your build needs RAM to function');
  }

  return {
    compatible: issues.length === 0,
    issues,
    suggestions,
  };
}
