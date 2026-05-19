// Coiny case — v1 sketch
// Coin form factor housing an M5StickS3 (48 × 24 × 15 mm)
// First-pass exploration. Not final dimensions.

// ─── Parameters ─────────────────────────────────────────────
coin_diameter      = 55;   // outer diameter of the coin
coin_thickness     = 18;   // total thickness of the case
wall               = 2.5;  // wall thickness

stick_length       = 48;   // M5StickS3 length
stick_width        = 24;   // M5StickS3 width
stick_depth        = 15;   // M5StickS3 depth (incl. battery)

screen_width       = 17;   // M5StickS3 LCD width
screen_height      = 32;   // M5StickS3 LCD height
screen_offset_y    = 5;    // distance from top edge of stick to screen

usb_c_width        = 9;
usb_c_height       = 4;

button_diameter    = 4;

loop_hole_dia      = 4;
loop_arm_length    = 6;

$fn = 96;                  // smoothness

// ─── Helpers ────────────────────────────────────────────────
module coin_blank() {
    cylinder(h = coin_thickness, d = coin_diameter);
}

module stick_cavity() {
    // Pocket the M5StickS3 sits in (with a hair of slack)
    translate([-stick_length/2 - 0.3, -stick_width/2 - 0.3, wall])
        cube([stick_length + 0.6, stick_width + 0.6, stick_depth + 1]);
}

module screen_window() {
    // Cut-out on top face for the LCD
    translate([-screen_width/2, -screen_height/2 + screen_offset_y, coin_thickness - wall - 1])
        cube([screen_width, screen_height, wall + 2]);
}

module usb_c_slot() {
    // USB-C port on the bottom edge (6 o'clock)
    translate([-usb_c_width/2, -coin_diameter/2 - 1, coin_thickness/2 - usb_c_height/2 - 1])
        cube([usb_c_width, wall + 4, usb_c_height]);
}

module front_buttons() {
    // Two buttons on the front face, flanking the screen
    for (x = [-10, 10])
        translate([x, screen_offset_y - 14, coin_thickness - 1])
            cylinder(h = wall + 2, d = button_diameter);
}

module side_button() {
    // One side button at 3 o'clock
    rotate([0, 90, 0])
        translate([-coin_thickness/2, 0, coin_diameter/2 - 1])
            cylinder(h = wall + 4, d = button_diameter);
}

module speaker_grille() {
    // Dot-pattern speaker grille on the back face
    for (x = [-6, -3, 0, 3, 6])
        for (y = [-6, -3, 0, 3, 6])
            if (x*x + y*y <= 49)
                translate([x + 18, y, -1])
                    cylinder(h = wall + 2, d = 1.2);
}

module keychain_loop() {
    // Lozenge-shaped loop at 12 o'clock
    translate([0, coin_diameter/2, coin_thickness/2])
        rotate([90, 0, 0])
            difference() {
                hull() {
                    cylinder(h = coin_thickness * 0.7, d = loop_arm_length + 4, center = true);
                    translate([0, loop_arm_length, 0])
                        cylinder(h = coin_thickness * 0.7, d = loop_arm_length + 4, center = true);
                }
                hull() {
                    cylinder(h = coin_thickness, d = loop_hole_dia, center = true);
                    translate([0, loop_arm_length, 0])
                        cylinder(h = coin_thickness, d = loop_hole_dia, center = true);
                }
            }
}

// ─── Body ───────────────────────────────────────────────────
difference() {
    union() {
        coin_blank();
        keychain_loop();
    }
    stick_cavity();
    screen_window();
    usb_c_slot();
    front_buttons();
    side_button();
    speaker_grille();
}
