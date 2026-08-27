export const OPENING_CASH_BALANCE = 5100;
export const CASH_DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];
export const DEFAULT_DENOMINATION_STATE = Object.fromEntries(
  CASH_DENOMINATIONS.map(d => [d, ''])
);

export const EXPENSE_CATEGORIES = [
  'Groceries & Dairy', 'Staff-Expense', 'Petrol', 'Maintenance',
  'Advertisement', 'Salary', 'Stationary', 'Freight', 'Other'
];

export const OUTLETS = ['FREEGANJ', 'NANAKHEDA'];
export const DEFAULT_LEGACY_OUTLET = 'NANAKHEDA';
export const OUTLET_STORAGE_KEY = 'dsr_selected_outlet';

// Owner: everything, including managing team accounts and destructive
// catalogue operations (Danger Zone, Resync).
// Store Manager: full day-to-day operations across both outlets — entry,
// reports, inventory, editing/adding master items — but not user
// management or the catalogue-wide destructive actions.
// Staff: data entry only (New DSR Entry, Daily Stock Closing). No
// visibility into sales figures, reports, or the item catalogue.
export const ROLES = ['owner', 'manager', 'staff'];
export const ROLE_LABELS = { owner: 'Owner', manager: 'Store Manager', staff: 'Staff' };

// Which top-level views each role can navigate to. App.jsx uses this both
// to decide which nav buttons to render and to redirect a user off a view
// they've lost access to (e.g. a role change mid-session).
export const VIEW_ACCESS = {
  owner: ['dashboard', 'new', 'history', 'daily_stock', 'inventory_summary', 'inventory_master', 'user_management'],
  manager: ['dashboard', 'new', 'history', 'daily_stock', 'inventory_summary', 'inventory_master'],
  staff: ['new', 'daily_stock'],
};

export const INVENTORY_CATEGORIES = [
  { code: 'A', name: 'Base' },
  { code: 'B', name: 'Dips & Sauces' },
  { code: 'C', name: 'Toppings' },
  { code: 'D', name: 'Cheese' },
  { code: 'E', name: 'Seasonings & Ketchups' },
  { code: 'F', name: 'Side Orders' },
  { code: 'G', name: 'Boxes and Papers' },
  { code: 'H', name: 'Other Essentials' },
  { code: 'I', name: 'Beverages' }
];

export const INVENTORY_UOMS = ['/KG', '/PKT', '/TIN', '/BTL', '/NOS'];

export const DEFAULT_INVENTORY_ITEMS = [
  { "id": "item_1", "name": "Maida (1X50kg)", "category": "Base", "categoryCode": "A", "uom": "/KG", "netPrice": 39.4 },
  { "id": "item_2", "name": "Dough Pouch (1X6X1.8kg)", "category": "Base", "categoryCode": "A", "uom": "/KG", "netPrice": 619.5 },
  { "id": "item_3", "name": "Soyabean Oil (1X13.6kg)", "category": "Base", "categoryCode": "A", "uom": "/KG", "netPrice": 170.0 },
  { "id": "item_4", "name": "Cheese Blend (1X12)", "category": "Dips & Sauces", "categoryCode": "B", "uom": "/PKT", "netPrice": 213.675 },
  { "id": "item_5", "name": "English Gauda Cheese (1X12)", "category": "Dips & Sauces", "categoryCode": "B", "uom": "/PKT", "netPrice": 237.125 },
  { "id": "item_6", "name": "African Peri Peri (1X12)", "category": "Dips & Sauces", "categoryCode": "B", "uom": "/PKT", "netPrice": 261.48 },
  { "id": "item_7", "name": "Hot Chilli Garlic Dip (1X12)", "category": "Dips & Sauces", "categoryCode": "B", "uom": "/PKT", "netPrice": 156.45 },
  { "id": "item_8", "name": "Jalapeno Dip (1X12)", "category": "Dips & Sauces", "categoryCode": "B", "uom": "/PKT", "netPrice": 186.9875 },
  { "id": "item_9", "name": "Makhani Gravy (1X12)", "category": "Dips & Sauces", "categoryCode": "B", "uom": "/PKT", "netPrice": 218.925 },
  { "id": "item_10", "name": "Pesto Basil Mayonnaise (1X12)", "category": "Dips & Sauces", "categoryCode": "B", "uom": "/PKT", "netPrice": 0.0 },
  { "id": "item_11", "name": "Mexican Salsa (1X12)", "category": "Dips & Sauces", "categoryCode": "B", "uom": "/PKT", "netPrice": 0.0 },
  { "id": "item_12", "name": "Pizza & Pasta Sauce (1X8X1.5kg)", "category": "Dips & Sauces", "categoryCode": "B", "uom": "/PKT", "netPrice": 228.375 },
  { "id": "item_13", "name": "Jain Pizza & Pasta Sauce (1X8X1.5kg)", "category": "Dips & Sauces", "categoryCode": "B", "uom": "/PKT", "netPrice": 246.75 },
  { "id": "item_14", "name": "Kashmiri Gravy (1X12)", "category": "Dips & Sauces", "categoryCode": "B", "uom": "/PKT", "netPrice": 225.75 },
  { "id": "item_15", "name": "Nashville Sauce (1X12)", "category": "Dips & Sauces", "categoryCode": "B", "uom": "/PKT", "netPrice": 207.9 },
  { "id": "item_16", "name": "Jamaican Sauce (1X12)", "category": "Dips & Sauces", "categoryCode": "B", "uom": "/PKT", "netPrice": 217.35 },
  { "id": "item_17", "name": "Korean Sauce (1X12)", "category": "Dips & Sauces", "categoryCode": "B", "uom": "/PKT", "netPrice": 210.0 },
  { "id": "item_18", "name": "Jalapeno Tin (1X6)", "category": "Toppings", "categoryCode": "C", "uom": "/TIN", "netPrice": 256.2 },
  { "id": "item_19", "name": "Mushroom Tin (1X24)", "category": "Toppings", "categoryCode": "C", "uom": "/TIN", "netPrice": 82.95 },
  { "id": "item_20", "name": "Pineapple Tin (1X24)", "category": "Toppings", "categoryCode": "C", "uom": "/TIN", "netPrice": 109.2 },
  { "id": "item_21", "name": "Baby Corn (1X24)", "category": "Toppings", "categoryCode": "C", "uom": "/TIN", "netPrice": 116.55 },
  { "id": "item_22", "name": "Black Olives (1X6)", "category": "Toppings", "categoryCode": "C", "uom": "/TIN", "netPrice": 690.9 },
  { "id": "item_23", "name": "Red Peprika (1X6)", "category": "Toppings", "categoryCode": "C", "uom": "/TIN", "netPrice": 401.1 },
  { "id": "item_24", "name": "Sweet Corn", "category": "Toppings", "categoryCode": "C", "uom": "/PKT", "netPrice": 65.0 },
  { "id": "item_25", "name": "Tomatoes", "category": "Toppings", "categoryCode": "C", "uom": "/KG", "netPrice": 40.0 },
  { "id": "item_26", "name": "Capsicum", "category": "Toppings", "categoryCode": "C", "uom": "/KG", "netPrice": 80.0 },
  { "id": "item_27", "name": "Onion", "category": "Toppings", "categoryCode": "C", "uom": "/KG", "netPrice": 40.0 },
  { "id": "item_28", "name": "Paneer", "category": "Toppings", "categoryCode": "C", "uom": "/KG", "netPrice": 320.0 },
  { "id": "item_29", "name": "Mozzarella (1X6X2kg)", "category": "Cheese", "categoryCode": "D", "uom": "/PKT", "netPrice": 830.0 },
  { "id": "item_30", "name": "Cheddar (1X6X2kg)", "category": "Cheese", "categoryCode": "D", "uom": "/PKT", "netPrice": 956.0 },
  { "id": "item_31", "name": "Colby (1X6X2kg)", "category": "Cheese", "categoryCode": "D", "uom": "/PKT", "netPrice": 1220.0 },
  { "id": "item_32", "name": "Monterey (1X6X2kg)", "category": "Cheese", "categoryCode": "D", "uom": "/PKT", "netPrice": 1220.0 },
  { "id": "item_33", "name": "Orange Cheddar (1X6X2kg)", "category": "Cheese", "categoryCode": "D", "uom": "/PKT", "netPrice": 1166.256 },
  { "id": "item_34", "name": "Premium Cheese Sauce Burst (1X24)", "category": "Cheese", "categoryCode": "D", "uom": "/PKT", "netPrice": 197.4 },
  { "id": "item_35", "name": "White Melted Cheese Burst (1X24)", "category": "Cheese", "categoryCode": "D", "uom": "/PKT", "netPrice": 194.25 },
  { "id": "item_36", "name": "Paneer Marinade Seasoning", "category": "Seasonings & Ketchups", "categoryCode": "E", "uom": "/KG", "netPrice": 407.4 },
  { "id": "item_37", "name": "Korean Seasoning", "category": "Seasonings & Ketchups", "categoryCode": "E", "uom": "/PKT", "netPrice": 134.4 },
  { "id": "item_38", "name": "Garlic Bread Seasoning", "category": "Seasonings & Ketchups", "categoryCode": "E", "uom": "/KG", "netPrice": 404.25 },
  { "id": "item_39", "name": "Chilli Flakes Pouch (1kg)", "category": "Seasonings & Ketchups", "categoryCode": "E", "uom": "/PKT", "netPrice": 420.0 },
  { "id": "item_40", "name": "Chilli Flakes Sachet (1X16X500)", "category": "Seasonings & Ketchups", "categoryCode": "E", "uom": "/PKT", "netPrice": 383.25 },
  { "id": "item_41", "name": "Oregano Spice Mix Pouch (1kg)", "category": "Seasonings & Ketchups", "categoryCode": "E", "uom": "/PKT", "netPrice": 551.25 },
  { "id": "item_42", "name": "Oregano Spice Mix Sachet (1X16X500)", "category": "Seasonings & Ketchups", "categoryCode": "E", "uom": "/PKT", "netPrice": 409.5 },
  { "id": "item_43", "name": "Tomato Ketchup Pouch (1X12X950gm)", "category": "Seasonings & Ketchups", "categoryCode": "E", "uom": "/PKT", "netPrice": 91.35 },
  { "id": "item_44", "name": "Tomato Ketchup Sachet", "category": "Seasonings & Ketchups", "categoryCode": "E", "uom": "/PKT", "netPrice": 154.0 },
  { "id": "item_45", "name": "Herb Mix (250gm)", "category": "Seasonings & Ketchups", "categoryCode": "E", "uom": "/PKT", "netPrice": 132.3 },
  { "id": "item_46", "name": "Tortilla Wrap Medium Quesadillas (1X12)", "category": "Side Orders", "categoryCode": "F", "uom": "/PKT", "netPrice": 70.0 },
  { "id": "item_47", "name": "Tortilla Wrap Small Quesadillas(1X24)", "category": "Side Orders", "categoryCode": "F", "uom": "/PKT", "netPrice": 46.0 },
  { "id": "item_48", "name": "Flaky Parantha Tacos (1X12)", "category": "Side Orders", "categoryCode": "F", "uom": "/PKT", "netPrice": 149.0 },
  { "id": "item_49", "name": "Pasta Fusilli (1X24)", "category": "Side Orders", "categoryCode": "F", "uom": "/PKT", "netPrice": 57.75 },
  { "id": "item_50", "name": "Pasta Macaroni (1X20)", "category": "Side Orders", "categoryCode": "F", "uom": "/PKT", "netPrice": 57.75 },
  { "id": "item_51", "name": "Lasagne (1X24X500gm)", "category": "Side Orders", "categoryCode": "F", "uom": "/PKT", "netPrice": 133.35 },
  { "id": "item_52", "name": "Spaghetti (1X24X500gm)", "category": "Side Orders", "categoryCode": "F", "uom": "/PKT", "netPrice": 79.8 },
  { "id": "item_53", "name": "K-Cuisine Oil (1X40)", "category": "Side Orders", "categoryCode": "F", "uom": "/BTL", "netPrice": 232.05 },
  { "id": "item_54", "name": "Eggless Choco LavaCake Premix (kg)", "category": "Side Orders", "categoryCode": "F", "uom": "/KG", "netPrice": 288.75 },
  { "id": "item_55", "name": "Brownie Premix (kg)", "category": "Side Orders", "categoryCode": "F", "uom": "/KG", "netPrice": 252.0 },
  { "id": "item_56", "name": "Hot Fudge Chocolate Syrup (1X12)", "category": "Side Orders", "categoryCode": "F", "uom": "/PKT", "netPrice": 284.55 },
  { "id": "item_57", "name": "Butter Yummy (500gm)", "category": "Side Orders", "categoryCode": "F", "uom": "/PKT", "netPrice": 87.5 },
  { "id": "item_58", "name": "Rich Cream (1lit)", "category": "Side Orders", "categoryCode": "F", "uom": "/PKT", "netPrice": 200.0 },
  { "id": "item_59", "name": "Milk Tetrapack (1lit)", "category": "Side Orders", "categoryCode": "F", "uom": "/PKT", "netPrice": 80.0 },
  { "id": "item_60", "name": "Dark Choco Compound COD15", "category": "Side Orders", "categoryCode": "F", "uom": "/PKT", "netPrice": 200.0 },
  { "id": "item_61", "name": "Garlic Bread", "category": "Side Orders", "categoryCode": "F", "uom": "/PKT", "netPrice": 50.0 },
  { "id": "item_62", "name": "Rice", "category": "Side Orders", "categoryCode": "F", "uom": "/KG", "netPrice": 120.0 },
  { "id": "item_63", "name": "Bread Crumbs", "category": "Side Orders", "categoryCode": "F", "uom": "/PKT", "netPrice": 100.0 },
  { "id": "item_64", "name": "7'' inch Regular Box (1X100)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 7.245 },
  { "id": "item_65", "name": "10'' inch Medium Box (1X50)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 14.07 },
  { "id": "item_66", "name": "13'' inch Large Box (1X50)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 18.375 },
  { "id": "item_67", "name": "18'' inch Giant Box (1X25)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 39.9 },
  { "id": "item_68", "name": "24'' inch Monster Box (1x15)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 67.725 },
  { "id": "item_69", "name": "Lunch Meal Regular Tray (1X50)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 4.641 },
  { "id": "item_70", "name": "Lunch Meal Medium Tray (1X50)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 6.405 },
  { "id": "item_71", "name": "Garlic Bread Box (1X200)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 6.846 },
  { "id": "item_72", "name": "Slice Box (1X200)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 6.93 },
  { "id": "item_73", "name": "Pasta Paper Sleeve (1X200)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 2.714 },
  { "id": "item_74", "name": "Pasta Paper Bowl & Lid (1X50)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 8.34 },
  { "id": "item_75", "name": "Pasta Aluminium Container (1X100)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 2.5 },
  { "id": "item_76", "name": "Choco Lava Box (1X200)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 3.73 },
  { "id": "item_77", "name": "Lava Cake Cups (1x140)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 5.67 },
  { "id": "item_78", "name": "Slice Tray (1X200)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 3.23 },
  { "id": "item_79", "name": "Paper Dip Pod & Lid (1X100)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 1.9824 },
  { "id": "item_80", "name": "Taco Box (1X100)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 4.2 },
  { "id": "item_81", "name": "Rice Bowl Box (1X100)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 7.14 },
  { "id": "item_82", "name": "Rice Bowl Container (1X100)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 6.5625 },
  { "id": "item_83", "name": "Rice Bowl Sleeve (1X100)", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 5.25 },
  { "id": "item_84", "name": "Beverages Glass & Lid", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 8.43 },
  { "id": "item_85", "name": "Beverages Straw", "category": "Boxes and Papers", "categoryCode": "G", "uom": "/NOS", "netPrice": 1.16 },
  { "id": "item_86", "name": "Pizza Stool (1X1000)", "category": "Other Essentials", "categoryCode": "H", "uom": "/NOS", "netPrice": 0.9912 },
  { "id": "item_87", "name": "Wrapping Roll & Foil", "category": "Other Essentials", "categoryCode": "H", "uom": "/PKT", "netPrice": 280.0 },
  { "id": "item_88", "name": "Spoon (1X50)", "category": "Other Essentials", "categoryCode": "H", "uom": "/PKT", "netPrice": 35.0 },
  { "id": "item_89", "name": "Fork (1X50)", "category": "Other Essentials", "categoryCode": "H", "uom": "/PKT", "netPrice": 40.0 },
  { "id": "item_90", "name": "Tissue (1X100)", "category": "Other Essentials", "categoryCode": "H", "uom": "/PKT", "netPrice": 29.205 },
  { "id": "item_91", "name": "Tissue Local (1X100)", "category": "Other Essentials", "categoryCode": "H", "uom": "/PKT", "netPrice": 14.0 },
  { "id": "item_92", "name": "Cello Tape (1X12)", "category": "Other Essentials", "categoryCode": "H", "uom": "/NOS", "netPrice": 50.0 },
  { "id": "item_93", "name": "Garbage Bag Small", "category": "Other Essentials", "categoryCode": "H", "uom": "/PKT", "netPrice": 25.0 },
  { "id": "item_94", "name": "Garbage Bag Large", "category": "Other Essentials", "categoryCode": "H", "uom": "/PKT", "netPrice": 65.0 },
  { "id": "item_95", "name": "Buffing Cap (1X100)", "category": "Other Essentials", "categoryCode": "H", "uom": "/PKT", "netPrice": 65.0 },
  { "id": "item_96", "name": "Printer Roll (1X50)", "category": "Other Essentials", "categoryCode": "H", "uom": "/NOS", "netPrice": 60.18 },
  { "id": "item_97", "name": "Carry Bag Small (1X50)", "category": "Other Essentials", "categoryCode": "H", "uom": "/NOS", "netPrice": 10.62 },
  { "id": "item_98", "name": "Carry Bag Medium (1X50)", "category": "Other Essentials", "categoryCode": "H", "uom": "/NOS", "netPrice": 17.94 },
  { "id": "item_99", "name": "Carry Bag Large (1X50)", "category": "Other Essentials", "categoryCode": "H", "uom": "/NOS", "netPrice": 20.06 },
  { "id": "item_100", "name": "Suma Grill (1ltr)", "category": "Other Essentials", "categoryCode": "H", "uom": "/NOS", "netPrice": 330.4 },
  { "id": "item_101", "name": "Drink 250 ml (1X28)", "category": "Beverages", "categoryCode": "I", "uom": "/NOS", "netPrice": 16.4 },
  { "id": "item_102", "name": "Drink 400 ml (1X24) 30Rs.", "category": "Beverages", "categoryCode": "I", "uom": "/NOS", "netPrice": 26.0 },
  { "id": "item_103", "name": "Can 180 ml (1X24) 30Rs.", "category": "Beverages", "categoryCode": "I", "uom": "/NOS", "netPrice": 26.0 },
  { "id": "item_104", "name": "Can 300 ml (1X24) 40Rs.", "category": "Beverages", "categoryCode": "I", "uom": "/NOS", "netPrice": 32.0 },
  { "id": "item_105", "name": "Can 330 ml (1X24) 70Rs.", "category": "Beverages", "categoryCode": "I", "uom": "/NOS", "netPrice": 42.0 },
  { "id": "item_106", "name": "Water 1 Ltr (1X12)", "category": "Beverages", "categoryCode": "I", "uom": "/NOS", "netPrice": 10.33 },
  { "id": "item_107", "name": "Frape Premix (kg)", "category": "Beverages", "categoryCode": "I", "uom": "/PKT", "netPrice": 569.1 },
  { "id": "item_108", "name": "Vanilla Syrup", "category": "Beverages", "categoryCode": "I", "uom": "/BTL", "netPrice": 295.05 },
  { "id": "item_109", "name": "Hazelnut Syrup", "category": "Beverages", "categoryCode": "I", "uom": "/BTL", "netPrice": 295.0 },
  { "id": "item_110", "name": "Caramel Syrup", "category": "Beverages", "categoryCode": "I", "uom": "/BTL", "netPrice": 273.0 },
  { "id": "item_111", "name": "Tiramisu Syrup", "category": "Beverages", "categoryCode": "I", "uom": "/BTL", "netPrice": 283.5 },
  { "id": "item_112", "name": "Mango Syrup", "category": "Beverages", "categoryCode": "I", "uom": "/BTL", "netPrice": 346.5 },
  { "id": "item_113", "name": "Mint Mojito Syrup", "category": "Beverages", "categoryCode": "I", "uom": "/BTL", "netPrice": 311.0 },
  { "id": "item_114", "name": "Green Apple Syrup", "category": "Beverages", "categoryCode": "I", "uom": "/BTL", "netPrice": 317.1 },
  { "id": "item_115", "name": "Spicy Guava Syrup", "category": "Beverages", "categoryCode": "I", "uom": "/BTL", "netPrice": 280.35 },
  { "id": "item_116", "name": "Kala Khatta Syrup", "category": "Beverages", "categoryCode": "I", "uom": "/BTL", "netPrice": 294.0 },
  { "id": "item_117", "name": "Hibiscus Syrup", "category": "Beverages", "categoryCode": "I", "uom": "/BTL", "netPrice": 320.25 },
  { "id": "item_118", "name": "Peach Ice Tea", "category": "Beverages", "categoryCode": "I", "uom": "/BTL", "netPrice": 333.9 },
  { "id": "item_119", "name": "Lemon Ice Tea", "category": "Beverages", "categoryCode": "I", "uom": "/BTL", "netPrice": 333.9 },
  { "id": "item_120", "name": "Coffee Sachet", "category": "Beverages", "categoryCode": "I", "uom": "/NOS", "netPrice": 2.0 }
];
