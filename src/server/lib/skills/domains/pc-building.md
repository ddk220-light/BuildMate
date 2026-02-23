---
id: pc-building
name: PC Building
description: Custom desktop computer builds including gaming, workstation, and general-purpose PCs
keywords: [computer, PC, desktop, gaming rig, workstation, GPU, CPU, motherboard, RAM, SSD, power supply, case, gaming PC, build a PC]
---

## Component Taxonomy

### CPU (Processor)
The CPU is the compatibility hub of any PC build. It determines motherboard socket, memory support, and cooling requirements.

**Key specs to evaluate:**
- Core count and thread count (affects multitasking and workstation workloads)
- Clock speed (base and boost, measured in GHz)
- Socket type (must match motherboard — LGA 1700, LGA 1851, AM5)
- TDP (thermal design power — determines cooling needs)
- Integrated graphics (some CPUs have iGPU, some don't — matters if no discrete GPU)

**Current platforms (2025-2026):**
- **Intel:** Core Ultra 200S series (Arrow Lake, LGA 1851) — latest. 14th Gen (Raptor Lake Refresh, LGA 1700) — previous gen, still widely available
- **AMD:** Ryzen 9000 series (Zen 5, AM5) — latest. Ryzen 7000 series (Zen 4, AM5) — excellent value

**Brand landscape:**
- Intel: Best for single-threaded gaming, widely compatible
- AMD: Best multi-threaded value, strong gaming, more power efficient

**Tiers by use case:**
- Budget gaming: AMD Ryzen 5 7600 / Intel Core i5-14400F
- Mid gaming: AMD Ryzen 7 7800X3D / Intel Core Ultra 7 265K
- High-end gaming: AMD Ryzen 7 9800X3D / Intel Core Ultra 9 285K
- Workstation: AMD Ryzen 9 9950X / Intel Core Ultra 9 285K
- Content creation: AMD Ryzen 9 9900X / Intel Core Ultra 7 265K

### GPU (Graphics Card)
The GPU is typically the most expensive component and has the largest impact on gaming and creative workload performance.

**Key specs to evaluate:**
- VRAM (video memory — 8GB minimum for 1080p, 12GB+ for 1440p, 16GB+ for 4K)
- Architecture generation (affects ray tracing, DLSS/FSR support)
- TDP / power draw (determines PSU requirements)
- Physical size (length and slot width — must fit the case)
- Display outputs (HDMI 2.1, DisplayPort 2.1)

**Current generation (2024-2026):**
- **NVIDIA:** RTX 5090, 5080, 5070 Ti, 5070 (Blackwell) — latest. RTX 4090, 4080 Super, 4070 Ti Super, 4070 Super, 4060 Ti, 4060 (Ada Lovelace) — previous gen
- **AMD:** RX 9070 XT, RX 9070 (RDNA 4) — latest. RX 7900 XTX, 7900 XT, 7800 XT, 7700 XT, 7600 (RDNA 3) — previous gen
- **Intel:** Arc B580 (Battlemage) — budget option

**Tiers by resolution:**
- 1080p gaming: RTX 4060 / RX 7600 / Arc B580 ($200-300)
- 1440p gaming: RTX 5070 / RTX 4070 Super / RX 9070 ($400-600)
- 4K gaming: RTX 5080 / RTX 4080 Super / RX 9070 XT ($600-1000)
- Enthusiast 4K: RTX 5090 / RTX 4090 ($1500-2000)

### Motherboard
The motherboard connects everything. It must match the CPU socket and RAM generation.

**Key specs to evaluate:**
- CPU socket (LGA 1700, LGA 1851, AM5 — MUST match CPU)
- Chipset (determines features like PCIe lanes, USB ports, overclocking support)
- Form factor (ATX, Micro-ATX, Mini-ITX — must fit case)
- RAM slots and max capacity (DDR4 or DDR5, number of slots)
- M.2 SSD slots (number and PCIe generation)
- Rear I/O (USB-C, USB-A count, audio, networking)

**Chipset tiers:**
- Intel LGA 1851: Z890 (OC, full features), B860 (mid-range), H810 (budget)
- Intel LGA 1700: Z790 (OC), B760 (mid-range), H770 (budget)
- AMD AM5: X870E/X870 (enthusiast), B850/B650 (mid-range), A620 (budget)

**Form factors:**
- ATX (305 x 244 mm): Most common, most expansion slots
- Micro-ATX (244 x 244 mm): Smaller, fewer expansion slots, fits smaller cases
- Mini-ITX (170 x 170 mm): Smallest, 1 PCIe slot, for compact builds

### RAM (Memory)
RAM must match the motherboard's supported generation and speeds.

**Key specs to evaluate:**
- Generation (DDR4 or DDR5 — must match motherboard)
- Capacity (16GB minimum, 32GB recommended, 64GB+ for workstation)
- Speed (measured in MT/s — higher is better, must be supported by motherboard)
- Latency (CAS latency — lower is better, CL30-36 for DDR5)
- Kit configuration (2x16GB preferred over 1x32GB for dual-channel)

**Current recommendations:**
- Budget: 16GB (2x8GB) DDR5-5600 (~$50-60)
- Standard: 32GB (2x16GB) DDR5-6000 (~$80-110)
- Workstation: 64GB (2x32GB) DDR5-6000 (~$160-220)
- Extreme: 128GB (4x32GB) DDR5-5600 (~$350+)

### Storage (SSD/HDD)
NVMe SSDs are standard for boot drives. SATA SSDs and HDDs for bulk storage.

**Key specs to evaluate:**
- Interface (NVMe PCIe 5.0/4.0/3.0 or SATA — NVMe strongly preferred)
- Capacity (1TB minimum for boot + games, 2TB recommended)
- Sequential read/write speeds
- TBW (terabytes written — endurance rating)
- Form factor (M.2 2280 for NVMe, 2.5" for SATA SSD)

**Tiers:**
- Budget boot: 1TB NVMe PCIe 4.0 ($60-80) — WD SN770, Kingston NV2
- Standard: 2TB NVMe PCIe 4.0 ($100-140) — Samsung 990 EVO, WD SN850X
- High-end: 2TB NVMe PCIe 5.0 ($150-200) — Samsung 990 Pro, Crucial T700
- Bulk storage: 2-4TB SATA HDD ($50-80) — Seagate Barracuda, WD Blue

### Power Supply (PSU)
Must provide enough wattage for all components with headroom. Quality matters for system stability.

**Key specs to evaluate:**
- Wattage (must exceed total system draw with 20%+ headroom)
- Efficiency rating (80 Plus Bronze/Gold/Platinum — Gold recommended)
- Modularity (fully modular preferred for cable management)
- Form factor (ATX, SFX for small builds)
- 12VHPWR connector (needed for RTX 4000/5000 series GPUs)

**Wattage guidelines:**
- Budget build (no discrete GPU): 450-550W
- Mid-range gaming (RTX 4060-4070): 650W
- High-end gaming (RTX 4080/5070): 750-850W
- Enthusiast (RTX 4090/5080/5090): 850-1000W

**Trusted brands:** Corsair, Seasonic, EVGA, be quiet!, Thermaltake

### Case (Chassis)
Must fit the motherboard form factor and GPU length.

**Key specs to evaluate:**
- Form factor support (ATX, Micro-ATX, Mini-ITX)
- Maximum GPU length (check clearance — modern GPUs can be 300-350mm)
- CPU cooler height clearance
- Airflow design (mesh front panels preferred)
- Fan/radiator support (for AIO liquid coolers)

**Tiers:**
- Budget ($50-80): NZXT H5, Corsair 3000D, Fractal Pop Air
- Mid-range ($80-130): Fractal North, Lian Li Lancool III, be quiet! Pure Base 500DX
- Premium ($130-200): Corsair 5000D, Lian Li O11 Dynamic EVO, Fractal Torrent

### CPU Cooler
Must match CPU socket and fit within case clearance.

**Key specs to evaluate:**
- Type (air tower, AIO liquid 240mm/280mm/360mm)
- Socket compatibility (must support CPU socket)
- TDP rating (must handle CPU's thermal output)
- Height (for air coolers — must fit case clearance)
- Radiator size (for AIO — case must have mounting space)

**Guidelines:**
- Budget/mid CPUs (65-105W TDP): Quality air cooler ($30-50)
- High-end CPUs (125-170W TDP): Large air cooler or 240-280mm AIO ($50-100)
- Enthusiast/overclocked CPUs (200W+ TDP): 360mm AIO ($100-180)

## Compatibility Rules

### Critical (Will Not Work If Violated)
- IF CPU is Intel LGA 1851 THEN motherboard MUST have LGA 1851 socket (Z890, B860, H810 chipset)
- IF CPU is Intel LGA 1700 THEN motherboard MUST have LGA 1700 socket (Z790, B760, H770 chipset)
- IF CPU is AMD AM5 THEN motherboard MUST have AM5 socket (X870, B850, B650, A620 chipset)
- IF motherboard supports DDR5 THEN RAM MUST be DDR5 (DDR4 and DDR5 are NOT interchangeable)
- IF motherboard supports DDR4 THEN RAM MUST be DDR4
- IF case is Mini-ITX THEN motherboard MUST be Mini-ITX
- IF case is Micro-ATX THEN motherboard MUST be Micro-ATX or Mini-ITX

### Important (Will Cause Issues)
- PSU wattage MUST be >= (CPU TDP + GPU TDP + 100W overhead) — recommend 20% additional headroom
- GPU physical length MUST be less than case maximum GPU clearance
- CPU cooler height MUST be less than case maximum cooler clearance
- IF GPU requires 12VHPWR connector THEN PSU should have native 12VHPWR (adapter is acceptable but not ideal)
- IF using NVMe SSD THEN motherboard must have available M.2 slot with matching PCIe generation

### Recommended (For Best Experience)
- RAM speed should match motherboard's sweet spot (e.g., DDR5-6000 for AMD AM5 with 1:1 FCLK)
- Use dual-channel RAM configuration (2 sticks preferred over 1)
- PSU should be 80 Plus Gold or better for efficiency and reliability
- Case should have mesh front panel for airflow
- At least one case fan as exhaust at rear

## Budget Allocation Templates

### Gaming (GPU-Heavy)
The GPU has the largest impact on gaming performance. Prioritize it.
- GPU: 35-40%
- CPU: 18-22%
- Motherboard: 10-13%
- RAM: 5-8%
- Storage: 6-9%
- PSU: 6-8%
- Case: 5-8%
- CPU Cooler: 3-5%

### Workstation / Content Creation (CPU-Heavy)
CPU and RAM matter most for rendering, compilation, and large datasets.
- CPU: 28-35%
- GPU: 20-25%
- RAM: 12-15%
- Motherboard: 10-13%
- Storage: 8-10%
- PSU: 6-8%
- Case: 5-7%
- CPU Cooler: 4-6%

### Balanced / General Purpose
Even distribution for mixed use (gaming + work + media).
- GPU: 28-32%
- CPU: 22-26%
- Motherboard: 10-12%
- RAM: 7-10%
- Storage: 8-10%
- PSU: 6-8%
- Case: 6-8%
- CPU Cooler: 3-5%

### Budget Build (Under $800)
Maximize value at every tier. Consider integrated graphics to skip GPU.
- GPU: 30-35% (or skip if using CPU with iGPU)
- CPU: 22-28%
- Motherboard: 12-15%
- RAM: 8-10%
- Storage: 8-10%
- PSU: 8-10%
- Case: 5-8%

## Recommended Stores

### Online Retailers
- **Amazon** — Widest selection, fast shipping, easy returns. Good for comparing prices. Watch for third-party seller inflated prices.
- **Newegg** — PC component specialist. Combo deals, detailed filtering by spec. Best for finding specific SKUs. Watch for marketplace sellers vs Newegg-sold items.
- **B&H Photo** — No sales tax in many states. Excellent for monitors, peripherals, and components. Reliable, authorized dealer.
- **Best Buy** — Good for in-store pickup, price matching, and seeing products in person. Limited PC component selection but carries major brands.

### In-Store (When Available)
- **Micro Center** — Best in-store PC component prices, especially CPUs. Exclusive CPU + motherboard combo discounts ($20-50 off). Limited locations (25 stores in US). Worth the trip if accessible.

### Price Comparison
- **PCPartPicker** — Essential tool for checking compatibility, comparing prices across retailers, and tracking price history. Always verify a build here before purchasing.

## Assembly Guide

### Tools Required
- Phillips head screwdriver (#2 size — covers 95% of PC screws)
- Anti-static wrist strap (recommended) or ground yourself by touching the case
- Zip ties or velcro straps for cable management
- Small flashlight or headlamp (case interiors are dark)

### Step Group 1: Core Platform (CPU + Motherboard + RAM + M.2 SSD)
**Assemble outside the case on the motherboard box for easy access.**

1. Open the CPU socket latch on the motherboard
2. Align CPU with socket (match the triangle/arrow indicator), drop it in — ZERO force needed
3. Close the socket latch (Intel: plastic cover pops off automatically)
4. Install M.2 SSD into the motherboard's M.2 slot, secure with screw
5. Install RAM sticks — use slots A2 and B2 (2nd and 4th from CPU) for dual-channel
6. Press RAM firmly until both clips click — this requires more force than expected

**Common mistakes:** Forgetting to enable XMP/EXPO in BIOS (RAM runs at base speed without it). Installing RAM in wrong slots (A1/B1 instead of A2/B2).

### Step Group 2: CPU Cooler Installation
**Install before putting motherboard in case — much easier with open access.**

1. Apply thermal paste if not pre-applied (pea-sized dot in center of CPU)
2. Mount cooler bracket/backplate according to cooler manual
3. Attach cooler, tighten in X-pattern (diagonal corners) for even pressure
4. Connect fan header to CPU_FAN on motherboard

**Common mistakes:** Over-tightening cooler screws. Forgetting to remove plastic cover from cooler contact plate. Not plugging in the fan header (system will thermal throttle or shut down).

### Step Group 3: Case Preparation + Motherboard Installation
1. Install case standoffs if not pre-installed (match motherboard form factor)
2. Install rear I/O shield if motherboard has a separate one
3. Lower motherboard onto standoffs, align with I/O shield
4. Secure with 9 screws (ATX) — don't over-tighten

### Step Group 4: GPU + PSU + Power Cables
1. Install PSU in case (fan facing down if case has bottom vent)
2. Route necessary cables: 24-pin ATX, 8-pin CPU, PCIe power, SATA power
3. Remove appropriate PCIe slot covers from case
4. Insert GPU into the top PCIe x16 slot — press firmly until click
5. Secure GPU with screws to case bracket
6. Connect PCIe power cable(s) to GPU

**Common mistakes:** Using daisy-chain PCIe cables for high-power GPUs (use separate cables). Forgetting the 8-pin CPU power cable (system won't POST). Not fully seating the GPU in the slot.

### Step Group 5: Storage, Front Panel, and Final Connections
1. Mount any 2.5"/3.5" drives in case bays
2. Connect SATA data and power cables to drives
3. Connect front panel headers (power button, USB, audio) — consult motherboard manual for pin layout
4. Connect case fans to motherboard fan headers or fan hub
5. Cable management: route cables behind motherboard tray, use tie points

### Step Group 6: First Boot and Configuration
1. Connect monitor, keyboard, power cable
2. Power on — first boot may take 30-60 seconds
3. Enter BIOS (DEL or F2 on startup)
4. Enable XMP/EXPO profile for RAM (critical for performance)
5. Verify all components detected (CPU, RAM amount, storage drives)
6. Set boot priority to USB if installing OS from USB drive
7. Install operating system
8. Install GPU drivers from manufacturer website (NVIDIA GeForce Experience or AMD Adrenalin)

**Common mistakes:** Panicking when first boot takes long. Not enabling XMP/EXPO. Installing GPU drivers from Windows Update instead of manufacturer (outdated).
