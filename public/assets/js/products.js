/**
 * AL-NASSIM Product Catalog
 * ============================================================================
 * Central product data source. Each product has a unique slug (used in the URL
 * ?id=slug) that the Product View page reads to load the correct product.
 *
 * Products are grouped by category. Images use paths relative to the nassim/
 * folder (e.g. "topcar/freezer.png").
 * ============================================================================
 */
window.NASSIM_PRODUCTS = [
  // ===== Cooling Appliances =====
  { id: "commercial-refrigerator-xg034", name: "Commercial Refrigerator XG034", price: 1250.000, currency: "KD", img: "topcar/XG034 freezer.png", images: ["topcar/XG034 freezer.png","topcar/cold1.png","topcar/cold2.png"], description: "Professional-grade refrigerator for supermarkets. Spacious interior with precise temperature control and energy-efficient compressor.", line: "XG Series", category: "Cooling Appliances", sku: "XG-034-RFR", specs: [
    { label: "Description", value: "Commercial Refrigerator", note: "Professional-grade for supermarkets." },
    { label: "Capacity", value: "Large", note: "Spacious interior." },
    { label: "Category", value: "Refrigerator", note: "Precision temperature control." },
    { label: "Compressor", value: "Energy-Efficient", note: "Low power consumption." }
  ]},
  { id: "display-cooler-xg035", name: "Display Cooler XG035", price: 980.000, currency: "KD", img: "topcar/cooling appliances XG035.png", images: ["topcar/cooling appliances XG035.png","topcar/cooling appliances XG0351.png","topcar/coolingadv.png"], description: "Glass door display cooler for beverages. Slim profile with LED lighting for maximum product visibility.", line: "XG Series", category: "Cooling Appliances", sku: "XG-035-CLR", specs: [
    { label: "Description", value: "Display Cooler", note: "Glass door for beverage display." },
    { label: "Capacity", value: "Medium", note: "Slim profile design." },
    { label: "Category", value: "Cooler", note: "LED interior lighting." },
    { label: "Door", value: "Glass", note: "Maximum product visibility." }
  ]},
  { id: "walk-in-freezer-unit", name: "Walk-in Freezer Unit", price: 2500.000, currency: "KD", img: "topcar/cooling appliances XG0351.png", images: ["topcar/cooling appliances XG0351.png","topcar/coldroom.png","topcar/cold1.png"], description: "Industrial walk-in freezer solution. Large-capacity cold storage for warehouses and supermarkets.", line: "Industrial", category: "Cooling Appliances", sku: "WF-2500", specs: [
    { label: "Description", value: "Walk-in Freezer", note: "Industrial cold storage." },
    { label: "Capacity", value: "Extra Large", note: "Warehouse-scale storage." },
    { label: "Category", value: "Freezer", note: "Deep freeze capability." },
    { label: "Insulation", value: "Premium", note: "CFC-free insulation panels." }
  ]},
  { id: "reach-in-refrigerator", name: "Reach-in Refrigerator XG011", price: 850.000, currency: "KD", img: "topcar/refrigerator XG011.png", images: ["topcar/refrigerator XG011.png","topcar/fridge_advert.png","topcar/fridge_advert1.png"], description: "Compact reach-in refrigerator. Ideal for small retail spaces and commercial kitchens.", line: "XG Series", category: "Cooling Appliances", sku: "XG-011-RFR", specs: [
    { label: "Description", value: "Reach-in Refrigerator", note: "Compact commercial unit." },
    { label: "Capacity", value: "Small", note: "Space-saving design." },
    { label: "Category", value: "Refrigerator", note: "Precise climate control." },
    { label: "Finish", value: "Stainless Steel", note: "Easy to clean surface." }
  ]},
  { id: "ice-cream-freezer", name: "Ice Cream Freezer", price: 750.000, currency: "KD", img: "topcar/coolingadv.png", images: ["topcar/coolingadv.png","topcar/cold2.png","topcar/cold3.png"], description: "Specialized freezer for ice cream products. Curved glass top for maximum display appeal.", line: "Display", category: "Cooling Appliances", sku: "IC-750", specs: [
    { label: "Description", value: "Ice Cream Freezer", note: "Specialized for ice cream." },
    { label: "Capacity", value: "Medium", note: "Multiple basket storage." },
    { label: "Category", value: "Freezer", note: "Deep freeze -18°C." },
    { label: "Top", value: "Curved Glass", note: "Maximum display appeal." }
  ]},
  { id: "beverage-cooler-station", name: "Beverage Cooler Station", price: 650.000, currency: "KD", img: "topcar/coldroom.png", images: ["topcar/coldroom.png","topcar/cold1.png","topcar/cold4.png"], description: "Multi-zone beverage cooling station. Adjustable temperature zones for different beverage types.", line: "Multi-Zone", category: "Cooling Appliances", sku: "BC-650", specs: [
    { label: "Description", value: "Beverage Cooler Station", note: "Multi-zone cooling." },
    { label: "Capacity", value: "Medium", note: "Adjustable shelving." },
    { label: "Category", value: "Cooler", note: "Multiple temperature zones." },
    { label: "Zones", value: "3", note: "Independent zone control." }
  ]},

  // ===== Trolleys & Baskets =====
  { id: "shopping-trolley-sy143", name: "Shopping Trolley SY143", price: 62.000, currency: "KD", img: "topcar/trolly sy143.png", images: ["topcar/trolly sy143.png","topcar/trolly1.png","topcar/trolly2.png"], description: "Full-size supermarket shopping trolley with nested stacking and smooth-gliding casters.", line: "SY Series", category: "Trolleys & Baskets", sku: "SY-143-TRL", specs: [
    { label: "Description", value: "Shopping Trolley", note: "Full-size supermarket trolley." },
    { label: "Capacity", value: "165 L", note: "High-capacity basket." },
    { label: "Material", value: "Powder-Coated Steel", note: "Rust-resistant finish." },
    { label: "Wheels", value: "4 Swivel Casters", note: "Smooth-gliding action." }
  ]},
  { id: "checkout-trolley-sy236", name: "Checkout Trolley SY236", price: 88.000, currency: "KD", img: "topcar/checkoutSY236.png", images: ["topcar/checkoutSY236.png","topcar/checkoutSY2362.png","topcar/trolly4.png"], description: "Compact checkout trolley with coin-lock mechanism and child seat for express lanes.", line: "SY Series", category: "Trolleys & Baskets", sku: "SY-236-CKO", specs: [
    { label: "Description", value: "Checkout Trolley", note: "Compact express-lane trolley." },
    { label: "Capacity", value: "110 L", note: "Reinforced basket." },
    { label: "Features", value: "Coin-Lock + Child Seat", note: "Ready for express checkout." },
    { label: "Wheels", value: "4 Stable Base", note: "One-handed steering." }
  ]},
  { id: "shopping-basket-sy115", name: "Shopping Basket SY115", price: 9.500, currency: "KD", img: "topcar/basket SY115.png", images: ["topcar/basket SY115.png","topcar/basket.png","topcar/trollies & basket.png"], description: "Collapsible hand basket with reinforced grip. Push down to fold flat, pull up to fill.", line: "SY Series", category: "Trolleys & Baskets", sku: "SY-115-BSK", specs: [
    { label: "Description", value: "Collapsible Basket", note: "Folds flat for storage." },
    { label: "Capacity", value: "26 L", note: "Reinforced foldable frame." },
    { label: "Material", value: "UV-Stable Polymer", note: "Durable construction." },
    { label: "Grip", value: "Reinforced", note: "Comfortable carry handle." }
  ]},
  { id: "junior-shopping-trolley", name: "Junior Shopping Trolley", price: 34.000, currency: "KD", img: "topcar/childrentrolly_advert.png", images: ["topcar/childrentrolly_advert.png","topcar/trolly2.png"], description: "Child-sized shopping trolley engaging the next generation. Rounded safety edges and lightweight frame.", line: "Junior Series", category: "Trolleys & Baskets", sku: "SY-JR-060", specs: [
    { label: "Description", value: "Junior Shopping Trolley", note: "Child-sized trolley." },
    { label: "Capacity", value: "45 L", note: "Lightweight 3.5 kg frame." },
    { label: "Safety", value: "Rounded Edges", note: "Child-safe design." },
    { label: "Color", value: "Red & Blue", note: "Kid-friendly palette." }
  ]},

  // ===== Shelves & Stands =====
  { id: "display-shelf-yd1006", name: "Display Shelf YD1006", price: 47.000, currency: "KD", img: "topcar/shelfYD1006.png", images: ["topcar/shelfYD1006.png","topcar/shelfimg.png","topcar/shelf nd stand.png"], description: "Adjustable multi-tier display shelf with slim profile for supermarket aisles and boutique merchandising.", line: "YD Series", category: "Shelves & Stands", sku: "YD-1006-SLF", specs: [
    { label: "Description", value: "Display Shelf", note: "Adjustable multi-tier shelf." },
    { label: "Size", value: "900 x 450 x 1800 mm", note: "5 adjustable tiers." },
    { label: "Material", value: "Epoxy-Coated Steel", note: "Scratch-resistant retail finish." },
    { label: "Load", value: "60 kg/tier", note: "Load-tested per shelf." }
  ]},
  { id: "display-stand-sy225", name: "Display Stand SY225", price: 54.000, currency: "KD", img: "topcar/standSY225.png", images: ["topcar/standSY225.png","topcar/stand1.png","topcar/stand2.png"], description: "Promotional end-cap stand with rotating base and tiered baskets for high-visibility seasonal displays.", line: "SY Series", category: "Shelves & Stands", sku: "SY-225-STD", specs: [
    { label: "Description", value: "Promotional Stand", note: "Rotating 360° base." },
    { label: "Size", value: "Ø600 x 1600 mm", note: "4 tiered basket levels." },
    { label: "Material", value: "Powder-Coated Steel", note: "Tiered wire baskets." },
    { label: "Assembly", value: "Quick-Assembly", note: "No tools required." }
  ]},

  // ===== Warehouse =====
  { id: "heavy-duty-forklift", name: "Heavy Duty Forklift", price: 4950.000, currency: "KD", img: "topcar/forklift.png", images: ["topcar/forklift.png","topcar/forklift1.png","topcar/forklift_advert.png"], description: "Electric heavy-duty forklift with 5000 kg lift capacity, ergonomic mast and maintenance-free AC drive system.", line: "Industrial Lift", category: "Warehouse Equipment", sku: "FL-HD-5000", specs: [
    { label: "Description", value: "Electric Forklift", note: "Zero-emission indoor operation." },
    { label: "Capacity", value: "5000 kg / 4500 mm lift", note: "3-stage telescopic mast." },
    { label: "Power", value: "48V AC Drive", note: "Maintenance-free brushless motor." },
    { label: "Made in", value: "Germany", note: "Hand-finished by master engineers." }
  ]},
  { id: "order-picker", name: "Order Picker", price: 2780.000, currency: "KD", img: "topcar/picker1.png", images: ["topcar/picker1.png","topcar/picker2.png","topcar/heavylift.png"], description: "Mid-level order picker with elevated platform, precise fork tilt and compact turning radius for narrow-aisle fulfillment.", line: "Industrial Lift", category: "Warehouse Equipment", sku: "FL-OP-220", specs: [
    { label: "Description", value: "Order Picker", note: "Elevated operator platform." },
    { label: "Capacity", value: "1200 kg / 5800 mm lift", note: "Narrow-aisle 1.6 m radius." },
    { label: "Power", value: "24V DC Electric", note: "Regenerative braking." },
    { label: "Safety", value: "Fall Protection", note: "EN 1726 compliant." }
  ]},

  // ===== Houseware / Kitchenware =====
  { id: "gourmet-cookware-set", name: "Gourmet Cookware Set", price: 89.000, currency: "KD", img: "topcar/products_houseware/cookware2.png", images: ["topcar/products_houseware/cookware2.png","topcar/cookware.png","topcar/kitchen.png"], description: "10-piece stainless steel cookware set with tri-ply bases for even heat distribution and ergonomic stay-cool handles.", line: "Chef Series", category: "Kitchenware", sku: "CW-GRMT-10", specs: [
    { label: "Description", value: "10-Piece Cookware Set", note: "Pots, pans and tempered-glass lids." },
    { label: "Material", value: "18/10 Stainless Steel", note: "Encapsulated tri-ply bases." },
    { label: "Size", value: "16-24 cm range", note: "Oven-safe to 220°C." },
    { label: "Made in", value: "Portugal", note: "Hand-finished stainless steel." }
  ]},
  { id: "damascus-chef-knife", name: "Damascus Series Chef's Knife", price: 45.000, currency: "KD", img: "topcar/products_houseware/knife1.png", images: ["topcar/products_houseware/knife1.png","topcar/products_houseware/knife2.png","topcar/meat_knife.png"], description: "8-inch chef's knife with 67 layers of Damascus steel for unparalleled sharpness and a dark walnut handle for ergonomic grace.", line: "Damascus Series", category: "Kitchenware", sku: "DS-2024-KNF", specs: [
    { label: "Description", value: "Premium Chef's Knife", note: "Versatile 8-inch blade." },
    { label: "Blade", value: "67-Layer Damascus Steel", note: "Etched patterns unique to every blade." },
    { label: "Handle", value: "Dark Walnut", note: "Ergonomic grace." },
    { label: "Made in", value: "Seki, Japan", note: "Hand-finished by master bladesmiths." }
  ]},
  { id: "mopping-trolley", name: "Mopping Trolley", price: 58.000, currency: "KD", img: "topcar/products_houseware/clean_trolly.png", images: ["topcar/products_houseware/clean_trolly.png","topcar/clean_advert.png"], description: "Dual-bucket mopping trolley with wringer and organized storage. Efficiency in every swipe for a spotless environment.", line: "Clean Pro", category: "Cleaning Tools", sku: "CP-MOP-TRL", specs: [
    { label: "Description", value: "Dual-Bucket Mopping Trolley", note: "Integrated wringer and caddy." },
    { label: "Capacity", value: "2 x 20 L buckets", note: "Clean / dirty separation." },
    { label: "Color", value: "Yellow & Grey", note: "Color-coded for hygiene zones." },
    { label: "Wheels", value: "Non-Marking Silent", note: "Smooth floor operation." }
  ]},
  { id: "outdoor-pedal-bin", name: "Outdoor Pedal Bin", price: 27.000, currency: "KD", img: "topcar/products_houseware/dustbin.png", images: ["topcar/products_houseware/dustbin.png","topcar/trashbin_advert.png"], description: "Hands-free pedal bin with rugged durability for outdoor and industrial hygiene. Foot-operated soft-close lid.", line: "Clean Pro", category: "Cleaning Tools", sku: "CP-PED-BIN", specs: [
    { label: "Description", value: "Pedal Bin", note: "Foot-operated soft-close lid." },
    { label: "Capacity", value: "50 L", note: "Removable inner bucket." },
    { label: "Color", value: "Graphite", note: "UV-stable powder coating." },
    { label: "Made in", value: "Italy", note: "Corrosion-resistant outdoor build." }
  ]},
  { id: "basket-trolley-sy115", name: "Basket Trolley SY115", price: 95.0, currency: "KD", img: "topcar/basket SY115.png", images: ["topcar/basket SY115.png"], description: "Basket trolley for small shopping trips", line: "Trolleys & Baskets", category: "Trolleys & Baskets", sku: "BASKET-TROLLEY-SY115", specs: [
    { label: "Description", value: "Basket Trolley SY115", note: "Basket trolley for small shopping trips" },
    { label: "Category", value: "Trolleys & Baskets", note: "" },
    { label: "Price", value: "95.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "children-shopping-trolley", name: "Children Shopping Trolley", price: 120.0, currency: "KD", img: "advertisment/supermarket/childrentrolly.png", images: ["advertisment/supermarket/childrentrolly.png"], description: "Fun trolley designed for children", line: "Trolleys & Baskets", category: "Trolleys & Baskets", sku: "CHILDREN-SHOPPING-TR", specs: [
    { label: "Description", value: "Children Shopping Trolley", note: "Fun trolley designed for children" },
    { label: "Category", value: "Trolleys & Baskets", note: "" },
    { label: "Price", value: "120.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "heavy-duty-basket", name: "Heavy Duty Basket", price: 65.0, currency: "KD", img: "topcar/basket.png", images: ["topcar/basket.png"], description: "Durable shopping basket for heavy items", line: "Trolleys & Baskets", category: "Trolleys & Baskets", sku: "HEAVY-DUTY-BASKET", specs: [
    { label: "Description", value: "Heavy Duty Basket", note: "Durable shopping basket for heavy items" },
    { label: "Category", value: "Trolleys & Baskets", note: "" },
    { label: "Price", value: "65.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "double-basket-trolley", name: "Double Basket Trolley", price: 145.0, currency: "KD", img: "topcar/basketsdv.png", images: ["topcar/basketsdv.png"], description: "Trolley with double basket capacity", line: "Trolleys & Baskets", category: "Trolleys & Baskets", sku: "DOUBLE-BASKET-TROLLE", specs: [
    { label: "Description", value: "Double Basket Trolley", note: "Trolley with double basket capacity" },
    { label: "Category", value: "Trolleys & Baskets", note: "" },
    { label: "Price", value: "145.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "compact-hand-basket", name: "Compact Hand Basket", price: 35.0, currency: "KD", img: "topcar/bbg.png", images: ["topcar/bbg.png"], description: "Lightweight hand basket for quick shopping", line: "Trolleys & Baskets", category: "Trolleys & Baskets", sku: "COMPACT-HAND-BASKET", specs: [
    { label: "Description", value: "Compact Hand Basket", note: "Lightweight hand basket for quick shopping" },
    { label: "Category", value: "Trolleys & Baskets", note: "" },
    { label: "Price", value: "35.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "galvanized-steel-shelf", name: "Galvanized Steel Shelf", price: 280.0, currency: "KD", img: "topcar/galvanized.png", images: ["topcar/galvanized.png"], description: "Heavy-duty galvanized storage shelf", line: "Shelves & Stands", category: "Shelves & Stands", sku: "GALVANIZED-STEEL-SHE", specs: [
    { label: "Description", value: "Galvanized Steel Shelf", note: "Heavy-duty galvanized storage shelf" },
    { label: "Category", value: "Shelves & Stands", note: "" },
    { label: "Price", value: "280.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "wooden-display-stand", name: "Wooden Display Stand", price: 380.0, currency: "KD", img: "topcar/wooden.png", images: ["topcar/wooden.png"], description: "Premium wooden display stand for retail", line: "Shelves & Stands", category: "Shelves & Stands", sku: "WOODEN-DISPLAY-STAND", specs: [
    { label: "Description", value: "Wooden Display Stand", note: "Premium wooden display stand for retail" },
    { label: "Category", value: "Shelves & Stands", note: "" },
    { label: "Price", value: "380.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "hook-display-rack", name: "Hook Display Rack", price: 150.0, currency: "KD", img: "topcar/hook.png", images: ["topcar/hook.png"], description: "Wall-mounted hook display system", line: "Shelves & Stands", category: "Shelves & Stands", sku: "HOOK-DISPLAY-RACK", specs: [
    { label: "Description", value: "Hook Display Rack", note: "Wall-mounted hook display system" },
    { label: "Category", value: "Shelves & Stands", note: "" },
    { label: "Price", value: "150.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "basket-display-stand", name: "Basket Display Stand", price: 220.0, currency: "KD", img: "topcar/basket SY115.png", images: ["topcar/basket SY115.png"], description: "Wire basket display stand for produce", line: "Shelves & Stands", category: "Shelves & Stands", sku: "BASKET-DISPLAY-STAND", specs: [
    { label: "Description", value: "Basket Display Stand", note: "Wire basket display stand for produce" },
    { label: "Category", value: "Shelves & Stands", note: "" },
    { label: "Price", value: "220.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "checkout-counter-sy236", name: "Checkout Counter SY236", price: 1850.0, currency: "KD", img: "topcar/checkoutSY236.png", images: ["topcar/checkoutSY236.png"], description: "Modern checkout counter with conveyor belt", line: "Checkout Solutions", category: "Checkout Solutions", sku: "CHECKOUT-COUNTER-SY2", specs: [
    { label: "Description", value: "Checkout Counter SY236", note: "Modern checkout counter with conveyor belt" },
    { label: "Category", value: "Checkout Solutions", note: "" },
    { label: "Price", value: "1850.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "express-checkout-station", name: "Express Checkout Station", price: 1200.0, currency: "KD", img: "topcar/checkoutSY2362.png", images: ["topcar/checkoutSY2362.png"], description: "Compact express checkout for quick transactions", line: "Checkout Solutions", category: "Checkout Solutions", sku: "EXPRESS-CHECKOUT-STA", specs: [
    { label: "Description", value: "Express Checkout Station", note: "Compact express checkout for quick transactions" },
    { label: "Category", value: "Checkout Solutions", note: "" },
    { label: "Price", value: "1200.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "self-service-kiosk", name: "Self-Service Kiosk", price: 2200.0, currency: "KD", img: "topcar/standadv.png", images: ["topcar/standadv.png"], description: "Automated self-checkout kiosk system", line: "Checkout Solutions", category: "Checkout Solutions", sku: "SELF-SERVICE-KIOSK", specs: [
    { label: "Description", value: "Self-Service Kiosk", note: "Automated self-checkout kiosk system" },
    { label: "Category", value: "Checkout Solutions", note: "" },
    { label: "Price", value: "2200.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "cashier-desk-unit", name: "Cashier Desk Unit", price: 950.0, currency: "KD", img: "topcar/stand.png", images: ["topcar/stand.png"], description: "Traditional cashier desk with storage", line: "Checkout Solutions", category: "Checkout Solutions", sku: "CASHIER-DESK-UNIT", specs: [
    { label: "Description", value: "Cashier Desk Unit", note: "Traditional cashier desk with storage" },
    { label: "Category", value: "Checkout Solutions", note: "" },
    { label: "Price", value: "950.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "mobile-pos-terminal", name: "Mobile POS Terminal", price: 680.0, currency: "KD", img: "topcar/stand1.png", images: ["topcar/stand1.png"], description: "Portable point-of-sale terminal", line: "Checkout Solutions", category: "Checkout Solutions", sku: "MOBILE-POS-TERMINAL", specs: [
    { label: "Description", value: "Mobile POS Terminal", note: "Portable point-of-sale terminal" },
    { label: "Category", value: "Checkout Solutions", note: "" },
    { label: "Price", value: "680.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "bagging-station-pro", name: "Bagging Station Pro", price: 420.0, currency: "KD", img: "topcar/stand2.png", images: ["topcar/stand2.png"], description: "Ergonomic bagging and packaging station", line: "Checkout Solutions", category: "Checkout Solutions", sku: "BAGGING-STATION-PRO", specs: [
    { label: "Description", value: "Bagging Station Pro", note: "Ergonomic bagging and packaging station" },
    { label: "Category", value: "Checkout Solutions", note: "" },
    { label: "Price", value: "420.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "price-tag-holder-set", name: "Price Tag Holder Set", price: 45.0, currency: "KD", img: "topcar/hookimg.png", images: ["topcar/hookimg.png"], description: "Universal price tag holders for shelves", line: "Accessories", category: "Accessories", sku: "PRICE-TAG-HOLDER-SET", specs: [
    { label: "Description", value: "Price Tag Holder Set", note: "Universal price tag holders for shelves" },
    { label: "Category", value: "Accessories", note: "" },
    { label: "Price", value: "45.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "basket-liner-pack", name: "Basket Liner Pack", price: 28.0, currency: "KD", img: "topcar/basketsdv.png", images: ["topcar/basketsdv.png"], description: "Hygienic liners for shopping baskets", line: "Accessories", category: "Accessories", sku: "BASKET-LINER-PACK", specs: [
    { label: "Description", value: "Basket Liner Pack", note: "Hygienic liners for shopping baskets" },
    { label: "Category", value: "Accessories", note: "" },
    { label: "Price", value: "28.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "shelf-divider-system", name: "Shelf Divider System", price: 65.0, currency: "KD", img: "topcar/frameimg.png", images: ["topcar/frameimg.png"], description: "Adjustable dividers for product organization", line: "Accessories", category: "Accessories", sku: "SHELF-DIVIDER-SYSTEM", specs: [
    { label: "Description", value: "Shelf Divider System", note: "Adjustable dividers for product organization" },
    { label: "Category", value: "Accessories", note: "" },
    { label: "Price", value: "65.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "product-pusher-strip", name: "Product Pusher Strip", price: 35.0, currency: "KD", img: "topcar/beamimg.png", images: ["topcar/beamimg.png"], description: "Spring-loaded product facing system", line: "Accessories", category: "Accessories", sku: "PRODUCT-PUSHER-STRIP", specs: [
    { label: "Description", value: "Product Pusher Strip", note: "Spring-loaded product facing system" },
    { label: "Category", value: "Accessories", note: "" },
    { label: "Price", value: "35.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "security-tag-dispenser", name: "Security Tag Dispenser", price: 120.0, currency: "KD", img: "topcar/shelfimg.png", images: ["topcar/shelfimg.png"], description: "Anti-theft security tag system", line: "Accessories", category: "Accessories", sku: "SECURITY-TAG-DISPENS", specs: [
    { label: "Description", value: "Security Tag Dispenser", note: "Anti-theft security tag system" },
    { label: "Category", value: "Accessories", note: "" },
    { label: "Price", value: "120.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "promotional-sign-kit", name: "Promotional Sign Kit", price: 55.0, currency: "KD", img: "topcar/rack1.png", images: ["topcar/rack1.png"], description: "Customizable promotional signage set", line: "Accessories", category: "Accessories", sku: "PROMOTIONAL-SIGN-KIT", specs: [
    { label: "Description", value: "Promotional Sign Kit", note: "Customizable promotional signage set" },
    { label: "Category", value: "Accessories", note: "" },
    { label: "Price", value: "55.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "electric-forklift-2000kg", name: "Electric Forklift 2000kg", price: 850.0, currency: "KD", img: "advertisment/warehouse/forklift.png", images: ["advertisment/warehouse/forklift.png"], description: "High-performance electric forklift for warehouse operations", line: "Warehouse Equipment", category: "Warehouse Equipment", sku: "ELECTRIC-FORKLIFT-20", specs: [
    { label: "Description", value: "Electric Forklift 2000kg", note: "High-performance electric forklift for warehouse operations" },
    { label: "Category", value: "Warehouse Equipment", note: "" },
    { label: "Price", value: "850.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "diesel-forklift-3000kg", name: "Diesel Forklift 3000kg", price: 1200.0, currency: "KD", img: "advertisment/warehouse/forklift1.png", images: ["advertisment/warehouse/forklift1.png"], description: "Heavy-duty diesel forklift for outdoor applications", line: "Warehouse Equipment", category: "Warehouse Equipment", sku: "DIESEL-FORKLIFT-3000", specs: [
    { label: "Description", value: "Diesel Forklift 3000kg", note: "Heavy-duty diesel forklift for outdoor applications" },
    { label: "Category", value: "Warehouse Equipment", note: "" },
    { label: "Price", value: "1200.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "plastic-pallet-standard", name: "Plastic Pallet Standard", price: 45.0, currency: "KD", img: "advertisment/warehouse/trollywarhouse.png", images: ["advertisment/warehouse/trollywarhouse.png"], description: "Durable plastic pallet for general storage", line: "Warehouse Equipment", category: "Warehouse Equipment", sku: "PLASTIC-PALLET-STAND", specs: [
    { label: "Description", value: "Plastic Pallet Standard", note: "Durable plastic pallet for general storage" },
    { label: "Category", value: "Warehouse Equipment", note: "" },
    { label: "Price", value: "45.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "wooden-pallet-heavy-duty", name: "Wooden Pallet Heavy Duty", price: 35.0, currency: "KD", img: "advertisment/warehouse/trollywarhouse1.png", images: ["advertisment/warehouse/trollywarhouse1.png"], description: "Sturdy wooden pallet for heavy loads", line: "Warehouse Equipment", category: "Warehouse Equipment", sku: "WOODEN-PALLET-HEAVY-", specs: [
    { label: "Description", value: "Wooden Pallet Heavy Duty", note: "Sturdy wooden pallet for heavy loads" },
    { label: "Category", value: "Warehouse Equipment", note: "" },
    { label: "Price", value: "35.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "compact-electric-forklift", name: "Compact Electric Forklift", price: 750.0, currency: "KD", img: "advertisment/warehouse/forklift.png", images: ["advertisment/warehouse/forklift.png"], description: "Space-saving electric forklift for narrow aisles", line: "Warehouse Equipment", category: "Warehouse Equipment", sku: "COMPACT-ELECTRIC-FOR", specs: [
    { label: "Description", value: "Compact Electric Forklift", note: "Space-saving electric forklift for narrow aisles" },
    { label: "Category", value: "Warehouse Equipment", note: "" },
    { label: "Price", value: "750.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "industrial-plastic-pallet", name: "Industrial Plastic Pallet", price: 65.0, currency: "KD", img: "advertisment/warehouse/trollywarhouse.png", images: ["advertisment/warehouse/trollywarhouse.png"], description: "Industrial-grade plastic pallet with reinforced structure", line: "Warehouse Equipment", category: "Warehouse Equipment", sku: "INDUSTRIAL-PLASTIC-P", specs: [
    { label: "Description", value: "Industrial Plastic Pallet", note: "Industrial-grade plastic pallet with reinforced structure" },
    { label: "Category", value: "Warehouse Equipment", note: "" },
    { label: "Price", value: "65.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "reach-truck-forklift", name: "Reach Truck Forklift", price: 950.0, currency: "KD", img: "advertisment/warehouse/forklift1.png", images: ["advertisment/warehouse/forklift1.png"], description: "Specialized reach truck for high-level storage", line: "Warehouse Equipment", category: "Warehouse Equipment", sku: "REACH-TRUCK-FORKLIFT", specs: [
    { label: "Description", value: "Reach Truck Forklift", note: "Specialized reach truck for high-level storage" },
    { label: "Category", value: "Warehouse Equipment", note: "" },
    { label: "Price", value: "950.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "export-wooden-pallet", name: "Export Wooden Pallet", price: 28.0, currency: "KD", img: "advertisment/warehouse/trollywarhouse1.png", images: ["advertisment/warehouse/trollywarhouse1.png"], description: "ISPM-15 certified wooden pallet for export", line: "Warehouse Equipment", category: "Warehouse Equipment", sku: "EXPORT-WOODEN-PALLET", specs: [
    { label: "Description", value: "Export Wooden Pallet", note: "ISPM-15 certified wooden pallet for export" },
    { label: "Category", value: "Warehouse Equipment", note: "" },
    { label: "Price", value: "28.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "heavy-duty-racking-system", name: "Heavy Duty Racking System", price: 450.0, currency: "KD", img: "advertisment/warehouse/heavyduty.png", images: ["advertisment/warehouse/heavyduty.png"], description: "Industrial-grade storage solution for warehouses", line: "Warehouse Equipment", category: "Warehouse Equipment", sku: "HEAVY-DUTY-RACKING-S", specs: [
    { label: "Description", value: "Heavy Duty Racking System", note: "Industrial-grade storage solution for warehouses" },
    { label: "Category", value: "Warehouse Equipment", note: "" },
    { label: "Price", value: "450.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "industrial-storage-rack", name: "Industrial Storage Rack", price: 380.0, currency: "KD", img: "advertisment/warehouse/heavyduty1.png", images: ["advertisment/warehouse/heavyduty1.png"], description: "Heavy-duty shelving for maximum load capacity", line: "Warehouse Equipment", category: "Warehouse Equipment", sku: "INDUSTRIAL-STORAGE-R", specs: [
    { label: "Description", value: "Industrial Storage Rack", note: "Heavy-duty shelving for maximum load capacity" },
    { label: "Category", value: "Warehouse Equipment", note: "" },
    { label: "Price", value: "380.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "pallet-racking-system", name: "Pallet Racking System", price: 520.0, currency: "KD", img: "advertisment/warehouse/forklift.png", images: ["advertisment/warehouse/forklift.png"], description: "Optimized for pallet storage and retrieval", line: "Warehouse Equipment", category: "Warehouse Equipment", sku: "PALLET-RACKING-SYSTE", specs: [
    { label: "Description", value: "Pallet Racking System", note: "Optimized for pallet storage and retrieval" },
    { label: "Category", value: "Warehouse Equipment", note: "" },
    { label: "Price", value: "520.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "mobile-shelving-unit", name: "Mobile Shelving Unit", price: 290.0, currency: "KD", img: "advertisment/warehouse/heavyduty.png", images: ["advertisment/warehouse/heavyduty.png"], description: "Flexible mobile storage solution", line: "Warehouse Equipment", category: "Warehouse Equipment", sku: "MOBILE-SHELVING-UNIT", specs: [
    { label: "Description", value: "Mobile Shelving Unit", note: "Flexible mobile storage solution" },
    { label: "Category", value: "Warehouse Equipment", note: "" },
    { label: "Price", value: "290.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "cantilever-rack", name: "Cantilever Rack", price: 410.0, currency: "KD", img: "advertisment/warehouse/heavyduty1.png", images: ["advertisment/warehouse/heavyduty1.png"], description: "Ideal for long and bulky items", line: "Warehouse Equipment", category: "Warehouse Equipment", sku: "CANTILEVER-RACK", specs: [
    { label: "Description", value: "Cantilever Rack", note: "Ideal for long and bulky items" },
    { label: "Category", value: "Warehouse Equipment", note: "" },
    { label: "Price", value: "410.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "drive-in-racking", name: "Drive-In Racking", price: 680.0, currency: "KD", img: "advertisment/warehouse/forklift.png", images: ["advertisment/warehouse/forklift.png"], description: "High-density storage system", line: "Warehouse Equipment", category: "Warehouse Equipment", sku: "DRIVE-IN-RACKING", specs: [
    { label: "Description", value: "Drive-In Racking", note: "High-density storage system" },
    { label: "Category", value: "Warehouse Equipment", note: "" },
    { label: "Price", value: "680.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "mezzanine-floor-system", name: "Mezzanine Floor System", price: 750.0, currency: "KD", img: "advertisment/warehouse/heavyduty.png", images: ["advertisment/warehouse/heavyduty.png"], description: "Multi-level storage solution", line: "Warehouse Equipment", category: "Warehouse Equipment", sku: "MEZZANINE-FLOOR-SYST", specs: [
    { label: "Description", value: "Mezzanine Floor System", note: "Multi-level storage solution" },
    { label: "Category", value: "Warehouse Equipment", note: "" },
    { label: "Price", value: "750.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "selective-pallet-rack", name: "Selective Pallet Rack", price: 390.0, currency: "KD", img: "advertisment/warehouse/heavyduty1.png", images: ["advertisment/warehouse/heavyduty1.png"], description: "Direct access to each pallet", line: "Warehouse Equipment", category: "Warehouse Equipment", sku: "SELECTIVE-PALLET-RAC", specs: [
    { label: "Description", value: "Selective Pallet Rack", note: "Direct access to each pallet" },
    { label: "Category", value: "Warehouse Equipment", note: "" },
    { label: "Price", value: "390.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "heavy-duty-platform-trolley", name: "Heavy Duty Platform Trolley", price: 180.0, currency: "KD", img: "topcar/trolly.png", images: ["topcar/trolly.png"], description: "Industrial platform trolley for heavy loads", line: "Trolleys & Baskets", category: "Trolleys & Baskets", sku: "HEAVY-DUTY-PLATFORM-", specs: [
    { label: "Description", value: "Heavy Duty Platform Trolley", note: "Industrial platform trolley for heavy loads" },
    { label: "Category", value: "Trolleys & Baskets", note: "" },
    { label: "Price", value: "180.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "wire-mesh-basket-trolley", name: "Wire Mesh Basket Trolley", price: 145.0, currency: "KD", img: "topcar/trolly1.png", images: ["topcar/trolly1.png"], description: "Versatile wire mesh basket for storage", line: "Trolleys & Baskets", category: "Trolleys & Baskets", sku: "WIRE-MESH-BASKET-TRO", specs: [
    { label: "Description", value: "Wire Mesh Basket Trolley", note: "Versatile wire mesh basket for storage" },
    { label: "Category", value: "Trolleys & Baskets", note: "" },
    { label: "Price", value: "145.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "foldable-hand-trolley", name: "Foldable Hand Trolley", price: 95.0, currency: "KD", img: "topcar/trolly2.png", images: ["topcar/trolly2.png"], description: "Compact foldable design for easy storage", line: "Trolleys & Baskets", category: "Trolleys & Baskets", sku: "FOLDABLE-HAND-TROLLE", specs: [
    { label: "Description", value: "Foldable Hand Trolley", note: "Compact foldable design for easy storage" },
    { label: "Category", value: "Trolleys & Baskets", note: "" },
    { label: "Price", value: "95.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "double-basket-shopping-trolley", name: "Double Basket Shopping Trolley", price: 220.0, currency: "KD", img: "topcar/trolly sy143.png", images: ["topcar/trolly sy143.png"], description: "Large capacity shopping trolley", line: "Trolleys & Baskets", category: "Trolleys & Baskets", sku: "DOUBLE-BASKET-SHOPPI", specs: [
    { label: "Description", value: "Double Basket Shopping Trolley", note: "Large capacity shopping trolley" },
    { label: "Category", value: "Trolleys & Baskets", note: "" },
    { label: "Price", value: "220.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "industrial-cage-trolley", name: "Industrial Cage Trolley", price: 275.0, currency: "KD", img: "topcar/trollies & basket.png", images: ["topcar/trollies & basket.png"], description: "Secure cage trolley for warehouse use", line: "Trolleys & Baskets", category: "Trolleys & Baskets", sku: "INDUSTRIAL-CAGE-TROL", specs: [
    { label: "Description", value: "Industrial Cage Trolley", note: "Secure cage trolley for warehouse use" },
    { label: "Category", value: "Trolleys & Baskets", note: "" },
    { label: "Price", value: "275.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "light-duty-service-trolley", name: "Light Duty Service Trolley", price: 85.0, currency: "KD", img: "topcar/trolly4.png", images: ["topcar/trolly4.png"], description: "Multi-shelf service trolley", line: "Trolleys & Baskets", category: "Trolleys & Baskets", sku: "LIGHT-DUTY-SERVICE-T", specs: [
    { label: "Description", value: "Light Duty Service Trolley", note: "Multi-shelf service trolley" },
    { label: "Category", value: "Trolleys & Baskets", note: "" },
    { label: "Price", value: "85.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "stackable-basket-container", name: "Stackable Basket Container", price: 65.0, currency: "KD", img: "topcar/basket.png", images: ["topcar/basket.png"], description: "Stackable plastic basket for organization", line: "Trolleys & Baskets", category: "Trolleys & Baskets", sku: "STACKABLE-BASKET-CON", specs: [
    { label: "Description", value: "Stackable Basket Container", note: "Stackable plastic basket for organization" },
    { label: "Category", value: "Trolleys & Baskets", note: "" },
    { label: "Price", value: "65.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "heavy-duty-wire-basket", name: "Heavy Duty Wire Basket", price: 125.0, currency: "KD", img: "topcar/basket SY115.png", images: ["topcar/basket SY115.png"], description: "Durable wire basket for heavy items", line: "Trolleys & Baskets", category: "Trolleys & Baskets", sku: "HEAVY-DUTY-WIRE-BASK", specs: [
    { label: "Description", value: "Heavy Duty Wire Basket", note: "Durable wire basket for heavy items" },
    { label: "Category", value: "Trolleys & Baskets", note: "" },
    { label: "Price", value: "125.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "minimalist-table-spoon", name: "Minimalist Table Spoon", price: 4.5, currency: "KD", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB272j1GxMqlKRV3lBWSJul3lWG3PjHVgdFzoha_GMcrogDSd5XfI16jJR-GpQLXtmWTPxSb8CSxz2zOjFfawVLSd9ZZ7BBdUx-ftodl2z6OT7YS4mAaFW_FtpSsneJGoFQGjYFccLGh9YrvRso_24eIsttcoDtynm7EwyrWqQrmiZU_3MbywqC-50OZ8I7zMvcnAi15G3d65hglLFNn6cmDhbNnQU0M-2_-niiBHlZ9KA9RCKxPtAHCpWH_B92jh6I5zr7zve_-cU", images: ["https://lh3.googleusercontent.com/aida-public/AB6AXuB272j1GxMqlKRV3lBWSJul3lWG3PjHVgdFzoha_GMcrogDSd5XfI16jJR-GpQLXtmWTPxSb8CSxz2zOjFfawVLSd9ZZ7BBdUx-ftodl2z6OT7YS4mAaFW_FtpSsneJGoFQGjYFccLGh9YrvRso_24eIsttcoDtynm7EwyrWqQrmiZU_3MbywqC-50OZ8I7zMvcnAi15G3d65hglLFNn6cmDhbNnQU0M-2_-niiBHlZ9KA9RCKxPtAHCpWH_B92jh6I5zr7zve_-cU"], description: "Premium minimalist table spoon crafted for quality and durability.", line: "Tableware", category: "Tableware", sku: "AN-SP-MN-01", specs: [
    { label: "Description", value: "Minimalist Table Spoon", note: "Premium tableware product." },
    { label: "Category", value: "Tableware", note: "" },
    { label: "Price", value: "4.500 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "eco-friendly-cleaning-tool-set", name: "Eco-Friendly Cleaning Tool Set", price: 18.0, currency: "KD", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAWoLbrASmz7dRvcre37b1C0DkA6Ytl-9IX6t2KSaGwsXr_Wu-wq2Z1vIQXbk_SckFDU6T_vO1hDqjSfDP2XSOaL0RMk0M-8mSQM_Z8RYEhRnFJZDSIkKkdMVMG0pckzreB4wIPQQNkLrHwSuOv-feyIUiaxno5QPRiHTRcB75yQ8QeYF45qpxoS0MNpyNSoLRhnF6laHTiDWkMoqd17n2qgwicB_K8DvFbqaJDluqzkukEXpg1FZzZWUqaLZnx5cpmkhRr9hFR2Co", images: ["https://lh3.googleusercontent.com/aida-public/AB6AXuAWoLbrASmz7dRvcre37b1C0DkA6Ytl-9IX6t2KSaGwsXr_Wu-wq2Z1vIQXbk_SckFDU6T_vO1hDqjSfDP2XSOaL0RMk0M-8mSQM_Z8RYEhRnFJZDSIkKkdMVMG0pckzreB4wIPQQNkLrHwSuOv-feyIUiaxno5QPRiHTRcB75yQ8QeYF45qpxoS0MNpyNSoLRhnF6laHTiDWkMoqd17n2qgwicB_K8DvFbqaJDluqzkukEXpg1FZzZWUqaLZnx5cpmkhRr9hFR2Co"], description: "Premium eco-friendly cleaning tool set crafted for quality and durability.", line: "Home Care", category: "Home Care", sku: "AN-HC-EC-12", specs: [
    { label: "Description", value: "Eco-Friendly Cleaning Tool Set", note: "Premium home care product." },
    { label: "Category", value: "Home Care", note: "" },
    { label: "Price", value: "18.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "artisan-ceramic-pitcher", name: "Artisan Ceramic Pitcher", price: 15.0, currency: "KD", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDna_K-oI-QFFyUHl9GkaGf8GT2e83ayYWxeMJB814JJCmthfaqEGESnw5RM3_B8AytimDGc0vtbUvtaVZyb8pArK8ckZI0J-swZiIINW8QvrEFKsJfWPFLogAn6MbcfYybq_6r_QzE57m3RufVBlRhIJF06T4C8t3v1fEsve8qPFgYK7zW39SmBOhwhNl-NmzeSH_MSBI2poRpznl8VFKUGl6dWHWoNDYxGDKWtO6J5U5u_-7ZT3v5NlMvTjJRf7tH1stYVCl192c", images: ["https://lh3.googleusercontent.com/aida-public/AB6AXuDna_K-oI-QFFyUHl9GkaGf8GT2e83ayYWxeMJB814JJCmthfaqEGESnw5RM3_B8AytimDGc0vtbUvtaVZyb8pArK8ckZI0J-swZiIINW8QvrEFKsJfWPFLogAn6MbcfYybq_6r_QzE57m3RufVBlRhIJF06T4C8t3v1fEsve8qPFgYK7zW39SmBOhwhNl-NmzeSH_MSBI2poRpznl8VFKUGl6dWHWoNDYxGDKWtO6J5U5u_-7ZT3v5NlMvTjJRf7tH1stYVCl192c"], description: "Premium artisan ceramic pitcher crafted for quality and durability.", line: "Ceramics", category: "Ceramics", sku: "AN-CR-PT-07", specs: [
    { label: "Description", value: "Artisan Ceramic Pitcher", note: "Premium ceramics product." },
    { label: "Category", value: "Ceramics", note: "" },
    { label: "Price", value: "15.000 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
  { id: "walnut-wood-coaster-set", name: "Walnut Wood Coaster Set", price: 9.5, currency: "KD", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDvfbahE1Cai5MY8naLoez05xOlvcG9z8Sn3Debz0sScxOiWPdMIVOjKx9a3MnEdkkIsGlX7F87ScUipOVunbW3pZ4w187YYLuDw6rDK91qW-fQqOzZVo9vwXNBbrqhQqloWtoMHorCDhf6d5mQVBR_yU07m2qlLPjoPRJa0l6NtmPxYH13EyJcJqIzUtOkgge2s9bI9iRCX_cEw9xdr89N4fbc4LV58tghZ_hynnIU7E_aUbY7t_P8uMHx44essafT1Av1M6_GurA", images: ["https://lh3.googleusercontent.com/aida-public/AB6AXuDvfbahE1Cai5MY8naLoez05xOlvcG9z8Sn3Debz0sScxOiWPdMIVOjKx9a3MnEdkkIsGlX7F87ScUipOVunbW3pZ4w187YYLuDw6rDK91qW-fQqOzZVo9vwXNBbrqhQqloWtoMHorCDhf6d5mQVBR_yU07m2qlLPjoPRJa0l6NtmPxYH13EyJcJqIzUtOkgge2s9bI9iRCX_cEw9xdr89N4fbc4LV58tghZ_hynnIU7E_aUbY7t_P8uMHx44essafT1Av1M6_GurA"], description: "Premium walnut wood coaster set crafted for quality and durability.", line: "Accessories", category: "Accessories", sku: "AN-AC-CS-09", specs: [
    { label: "Description", value: "Walnut Wood Coaster Set", note: "Premium accessories product." },
    { label: "Category", value: "Accessories", note: "" },
    { label: "Price", value: "9.500 KD", note: "Inclusive of VAT" },
    { label: "Availability", value: "In Stock", note: "Ready to ship" },
  ]},
];

/** Find a product by slug. Returns null if not found. */
window.NassimGetProduct = function (id) {
  if (!id) return null;
  for (var i = 0; i < window.NASSIM_PRODUCTS.length; i++) {
    if (window.NASSIM_PRODUCTS[i].id === id) return window.NASSIM_PRODUCTS[i];
  }
  return null;
};
