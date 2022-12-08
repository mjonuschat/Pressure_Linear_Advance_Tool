/**
 * Pressure Advance Calibration Pattern
 * Copyright (C) 2019 Sineos [https://github.com/Sineos]
 * Copyright (C) 2022 AndrewEllis93 [https://github.com/AndrewEllis93]
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
'use strict';

// increment to invalidate saved settings
const SETTINGS_VERSION = '3';

const PA_round = -4; // Was previously -3
const Z_round = -3;
const XY_round = -4;
const EXT_round = -5; // Was previously -4

const GLYPH_PADDING_HORIZONTAL = 1;
const GLYPH_PADDING_VERTICAL = 1;

const ENCROACHMENT = 1/3;

// set global HTML vars from form inputs
// -------------------------------------
function setVars(){
  window.ACCELERATION = parseInt($('#ACCELERATION').val());
  window.ACCELERATION_ENABLE = $('#ACCELERATION_ENABLE').prop('checked');
  window.ANCHOR_LAYER_LINE_RATIO = parseFloat($('#ANCHOR_LAYER_LINE_RATIO').val());
  window.ANCHOR_OPTION = $('#ANCHOR_OPTION').val();
  window.ANCHOR_PERIMETERS = parseFloat($('#ANCHOR_PERIMETERS').val());
  window.BED_SHAPE = $('#BED_SHAPE').val();
  window.BED_TEMP = parseInt($('#BED_TEMP').val());
  window.BED_X = parseInt($('#BED_X').val());
  window.BED_Y = parseInt($('#BED_Y').val());
  window.ECHO = $('#ECHO').prop('checked');
  window.END_GCODE = $('#END_GCODE').val();
  window.EXPERT_MODE = $('#EXPERT_MODE').prop('checked');
  window.EXTRUDER_NAME = $('#EXTRUDER_NAME').val();
  window.EXTRUDER_NAME_ENABLE = $('#EXTRUDER_NAME_ENABLE').prop('checked');
  window.EXT_MULT = parseFloat($('#EXT_MULT').val());
  window.FAN_SPEED = parseFloat($('#FAN_SPEED').val());
  window.FAN_SPEED_FIRSTLAYER = parseFloat($('#FAN_SPEED_FIRSTLAYER').val());
  window.FIRMWARE = $('#FIRMWARE').val();
  window.FILAMENT = $('#FILAMENT').val();
  window.FILAMENT_DIAMETER = parseFloat($('#FILAMENT_DIAMETER').val());
  window.FILENAME = $('#FILENAME').val();
  window.HEIGHT_FIRSTLAYER = parseFloat($('#HEIGHT_FIRSTLAYER').val());
  window.HEIGHT_LAYER = parseFloat($('#HEIGHT_LAYER').val());
  window.NUM_LAYERS = parseInt($('#NUM_LAYERS').val());
  window.HOTEND_TEMP = parseInt($('#HOTEND_TEMP').val());
  window.LINE_RATIO = parseFloat($('#LINE_RATIO').val());
  window.LINENO_NO_LEADING_ZERO = $('#LINENO_NO_LEADING_ZERO').prop('checked');
  window.NOZZLE_DIAMETER = parseFloat($('#NOZZLE_DIAMETER').val());
  window.ORIGIN_CENTER = $('#ORIGIN_CENTER').prop('checked');
  window.CORNER_ANGLE = parseInt($('#CORNER_ANGLE').val());
  window.PATTERN_OPTIONS_ENABLE = $('#PATTERN_OPTIONS_ENABLE').prop('checked');
  window.WALL_SIDE_LENGTH = parseInt($('#WALL_SIDE_LENGTH').val());
  window.PATTERN_SPACING = parseFloat($('#PATTERN_SPACING').val());
  window.PA_END = parseFloat($('#PA_END').val());
  window.PA_START = parseFloat($('#PA_START').val());
  window.PA_STEP = parseFloat($('#PA_STEP').val());
  window.WALL_COUNT = parseInt($('#WALL_COUNT').val());
  window.PRINTER = $('#PRINTER').val();
  window.PRINT_DIR = $('#PRINT_DIR').val();
  window.RETRACT_DIST = parseFloat($('#RETRACT_DIST').val());
  window.SPEED_FIRSTLAYER = parseInt($('#SPEED_FIRSTLAYER').val());
  window.SPEED_TRAVEL = parseInt($('#SPEED_TRAVEL').val());
  window.SPEED_PERIMETER = parseInt($('#SPEED_PERIMETER').val());
  window.SPEED_RETRACT = parseInt($('#SPEED_RETRACT').val());
  window.SPEED_UNRETRACT = parseInt($('#SPEED_UNRETRACT').val());
  window.START_GCODE = $('#START_GCODE').val();
  window.START_GCODE_TYPE = $('#START_GCODE_TYPE').val();
  window.TOOL_INDEX = $('#TOOL_INDEX').val();
  window.USE_LINENO = $('#USE_LINENO').prop('checked');
  window.ZHOP_ENABLE = $('#ZHOP_ENABLE').prop('checked');
  window.ZHOP_HEIGHT = parseFloat($('#ZHOP_HEIGHT').val());

  window.CUR_X = 0; // Globally track current coordinates
  window.CUR_Y = 0;
  window.CUR_Z = 0;
  window.RETRACTED = false;
  window.HOPPED = false; // Globally keep track of current retract state to prevent retracting/unretracting twice

  // adjust settings
  // ---------------
  if (BED_SHAPE === 'Round') {
    ORIGIN_CENTER = true;
    BED_Y = BED_X;
  }

  // if "pattern settings" checkbox isn't checked, set to defaults instead
  if (!PATTERN_OPTIONS_ENABLE){
    NUM_LAYERS = parseInt($('#NUM_LAYERS').prop("defaultValue"));
    WALL_COUNT = parseInt($('#WALL_COUNT').prop("defaultValue"));
    WALL_SIDE_LENGTH = parseInt($('#WALL_SIDE_LENGTH').prop("defaultValue"));
    PATTERN_SPACING = parseFloat($('#PATTERN_SPACING').prop("defaultValue"));
    CORNER_ANGLE = parseInt($('#CORNER_ANGLE').prop("defaultValue"));
    PRINT_DIR = 0;
  }

  // if "expert mode" is off, use defaults for expert settings
  if (!EXPERT_MODE){
    if (BED_SHAPE == 'Rect'){
      ORIGIN_CENTER = false
    }
    EXTRUDER_NAME_ENABLE = false
    TOOL_INDEX = parseInt($('#TOOL_INDEX').prop("defaultValue"))
    LINE_RATIO = parseInt($('#LINE_RATIO').prop("defaultValue"))
    ANCHOR_LAYER_LINE_RATIO = parseInt($('#ANCHOR_LAYER_LINE_RATIO').prop("defaultValue"))
    ANCHOR_PERIMETERS = parseInt($('#ANCHOR_PERIMETERS').prop("defaultValue"))
    USE_LINENO = true
    LINENO_NO_LEADING_ZERO = false
    ECHO = true
  }

  SPEED_FIRSTLAYER *= 60;
  SPEED_PERIMETER *= 60;
  SPEED_TRAVEL *= 60;
  SPEED_RETRACT *= 60;
  SPEED_UNRETRACT *= 60;

  EXTRUDER_NAME = EXTRUDER_NAME.trim()

  // replace variables with actual numbers in start g-code
  START_GCODE = START_GCODE.replace(/\[HOTEND_TEMP\]/g, HOTEND_TEMP)
  START_GCODE = START_GCODE.replace(/\[BED_TEMP\]/g, BED_TEMP)
  START_GCODE = START_GCODE.replace(/\[EXTRUDER_NAME\]/g, EXTRUDER_NAME)
  START_GCODE = START_GCODE.replace(/\[TOOL_INDEX\]/g, TOOL_INDEX)

  // set global calculated variables
  // -------------------------------
  window.NUM_PATTERNS = Math.round((PA_END - PA_START) / PA_STEP + 1);

  // line widths and extrusion ratios
  window.LINE_WIDTH = NOZZLE_DIAMETER * (LINE_RATIO / 100);
  window.ANCHOR_LAYER_LINE_WIDTH = NOZZLE_DIAMETER * (ANCHOR_LAYER_LINE_RATIO / 100);

  // line spacings
  window.LINE_SPACING = LINE_WIDTH - HEIGHT_LAYER * (1 - Math.PI / 4); // from slic3r documentation: spacing = extrusion_width - layer_height * (1 - PI/4)
  window.ANCHOR_LAYER_LINE_SPACING = ANCHOR_LAYER_LINE_WIDTH - HEIGHT_FIRSTLAYER * (1 - Math.PI / 4);
  window.LINE_SPACING_ANGLE = LINE_SPACING / Math.sin(toRadians(CORNER_ANGLE)/2);

  // calculate end dimensions so we can center the print properly & know where to start/end
  window.CENTER_X = (ORIGIN_CENTER ? 0 : BED_X / 2);
  window.CENTER_Y = (ORIGIN_CENTER ? 0 : BED_Y / 2);
  window.PRINT_SIZE_X = Math.round10((NUM_PATTERNS * ((WALL_COUNT - 1) * LINE_SPACING_ANGLE)) + 
                 ((NUM_PATTERNS - 1) *  (PATTERN_SPACING + LINE_WIDTH)) + 
                 (Math.cos(toRadians(CORNER_ANGLE)/2) * WALL_SIDE_LENGTH), XY_round);
  window.PRINT_SIZE_Y = Math.round10(2 * (Math.sin(toRadians(CORNER_ANGLE)/2) * WALL_SIDE_LENGTH), XY_round); // hypotenuse of given angle
  if (ANCHOR_OPTION == 'anchor_frame'){ // with anchor frame, right side is moved out so last pattern's tip doesn't run over it on the first layer
    PRINT_SIZE_X += ANCHOR_LAYER_LINE_SPACING * ANCHOR_PERIMETERS;
  }
  window.FRAME_SIZE_Y = (Math.sin(toRadians(CORNER_ANGLE / 2)) * WALL_SIDE_LENGTH) * 2

  // point to start the print
  window.PAT_START_X = CENTER_X - (PRINT_SIZE_X / 2);
  window.PAT_START_Y = CENTER_Y - (PRINT_SIZE_Y / 2);

  // additional calculations if line numbering is enabled
  if (USE_LINENO){
    window.GLYPH_START_X = PAT_START_X + ((((WALL_COUNT - 1) / 2) * LINE_SPACING_ANGLE) -2);
    window.GLYPH_END_X = PAT_START_X +
                  ((NUM_PATTERNS - 1) * (PATTERN_SPACING + LINE_WIDTH)) + 
                  ((NUM_PATTERNS - 1) * ((WALL_COUNT - 1) * LINE_SPACING_ANGLE)) + 4;

    window.GLYPH_TAB_MAX_X = GLYPH_END_X + GLYPH_PADDING_HORIZONTAL + ANCHOR_LAYER_LINE_WIDTH / 2
    if (PAT_START_X - GLYPH_START_X + GLYPH_PADDING_HORIZONTAL > 0){
      window.PATTERNSHIFT = PAT_START_X - GLYPH_START_X + GLYPH_PADDING_HORIZONTAL + ANCHOR_LAYER_LINE_WIDTH / 2
    } else (window.PATTERNSHIFT = 0)

    // adjust final dimensions & print start point again
    PRINT_SIZE_X += PATTERNSHIFT
    PRINT_SIZE_Y += calcMaxGlyphHeight(LINENO_NO_LEADING_ZERO) + GLYPH_PADDING_VERTICAL * 2 + ANCHOR_LAYER_LINE_WIDTH
    window.PAT_START_X = CENTER_X - (PRINT_SIZE_X / 2);
    window.PAT_START_Y = CENTER_Y - (PRINT_SIZE_Y / 2);
  } else {
    window.PATTERNSHIFT = 0;
  }

  // real world print size, accounting for rotation and line widths.
  // this is just used to ensure it will fit on the print bed during input validation
  // actual gcode rotation is done during gcode generation
  window.FIT_WIDTH = PRINT_SIZE_X + LINE_WIDTH; // actual size is technically + one line width in each direction, as it squishes outwards.... this is probably being excessively anal
  window.FIT_HEIGHT = PRINT_SIZE_Y + LINE_WIDTH;
  FIT_WIDTH = Math.abs(PRINT_SIZE_X * Math.cos(toRadians(PRINT_DIR))) + Math.abs(PRINT_SIZE_Y * Math.sin(toRadians(PRINT_DIR))); // rotate by PRINT_DIR
  FIT_HEIGHT = Math.abs(PRINT_SIZE_X * Math.sin(toRadians(PRINT_DIR))) + Math.abs(PRINT_SIZE_Y * Math.cos(toRadians(PRINT_DIR)));
}

function genGcode() {
  setVars();

  var basicSettings = {
    'anchorLineWidth': ANCHOR_LAYER_LINE_WIDTH,
    'anchorPerimeters': ANCHOR_PERIMETERS,
    'centerX': CENTER_X,
    'centerY': CENTER_Y,
    'encroachment': ENCROACHMENT,
    'extMult': EXT_MULT,
    'extruderName': EXTRUDER_NAME,
    'filamentDiameter': FILAMENT_DIAMETER,
    'firstLayerHeight': HEIGHT_FIRSTLAYER,
    'firstLayerSpeed': SPEED_FIRSTLAYER,
    'layerHeight': HEIGHT_LAYER,
    'lineWidth': LINE_WIDTH,
    'moveSpeed': SPEED_TRAVEL,
    'numPatterns': NUM_PATTERNS,
    'paEnd': PA_END,
    'paStart': PA_START,
    'paStep': PA_STEP,
    'perimSpeed': SPEED_PERIMETER,
    'printDir': PRINT_DIR,
    'retractDist': RETRACT_DIST,
    'retractSpeed': SPEED_RETRACT,
    'unretractSpeed': SPEED_UNRETRACT,
    'zhopEnable': ZHOP_ENABLE,
    'zhopHeight': ZHOP_HEIGHT
  };

  // Start G-code for pattern
  window.pa_script = `\
; ### Klipper Pressure Advance Calibration Pattern ###
;
; Original Marlin linear advance calibration tool by Sineos [https://github.com/Sineos]
; Heavily modified/rewritten by Andrew Ellis [https://github.com/AndrewEllis93]
;
; -------------------------------------------
; Generated: ${new Date()}
; -------------------------------------------
;
; Expert mode: ${EXPERT_MODE}
;
; Printer:
;  - Firmware: ${FIRMWARE}
;  - Bed Shape: ${BED_SHAPE}
${(BED_SHAPE === 'Round' ? `;  - Bed Diameter: ${BED_X} mm\n`: `;  - Bed Size X: ${BED_X} mm\n`)}\
${(BED_SHAPE === 'Round' ? '': `;  - Bed Size Y: ${BED_Y} mm\n`)}\
;  - Origin Bed Center: ${(ORIGIN_CENTER ? 'true': 'false')}
${(FIRMWARE == 'klipper' && EXTRUDER_NAME_ENABLE ? `;  - Extruder Name: ${EXTRUDER_NAME}\n` : '')}\
${(FIRMWARE == 'klipper' && !EXTRUDER_NAME_ENABLE ? `;  - Extruder Name: Disabled\n` : '')}\
${(FIRMWARE != 'klipper' && TOOL_INDEX != 0 ? `;  - Tool Index: ${TOOL_INDEX}\n` : '')}\
${(FIRMWARE != 'klipper' && TOOL_INDEX == 0 ? `;  - Tool Index: Disabled (0)\n` : '')}\
;  - Travel Speed: ${SPEED_TRAVEL / 60} mm/s
;  - Nozzle Diameter: ${NOZZLE_DIAMETER} mm
;  - Filament Diameter: ${FILAMENT_DIAMETER} mm
;  - Extrusion Multiplier: ${EXT_MULT}
;
; Retraction / Z Hop:
;  - Retraction Distance: ${RETRACT_DIST} mm
;  - Retract Speed: ${SPEED_RETRACT / 60} mm/s
;  - Unretract Speed: ${SPEED_UNRETRACT / 60} mm/s
;  - Z Hop Enable: ${ZHOP_ENABLE}
${(ZHOP_ENABLE ? `;  - Z Hop Height: ${ZHOP_HEIGHT}mm\n`: '')}\
;
; First Layer Settings:
;  - First Layer Height: ${HEIGHT_FIRSTLAYER} mm
;  - First Layer Printing Speed: ${SPEED_FIRSTLAYER / 60} mm/s
;  - First Layer Fan Speed: ${FAN_SPEED_FIRSTLAYER}%
;  - Anchor Option: ${ANCHOR_OPTION}
${(ANCHOR_OPTION == 'anchor_frame' ? `;  - Anchor Frame Perimeters: ${ANCHOR_PERIMETERS}\n`: '')}\
${(ANCHOR_OPTION != 'no_anchor' ? `;  - Anchor Line Width: ${ANCHOR_LAYER_LINE_RATIO} %\n`: '')}\
;
; Print Settings:
;  - Line Width: ${LINE_RATIO} %
;  - Layer Count: ${NUM_LAYERS}
;  - Layer Height: ${HEIGHT_LAYER} mm
;  - Print Speed: ${SPEED_PERIMETER / 60} mm/s
;  - Acceleration: ${ACCELERATION_ENABLE ? `${ACCELERATION} mm/s^2` : `Disabled`}
;  - Fan Speed: ${FAN_SPEED}%
;
; Pattern Settings ${(!PATTERN_OPTIONS_ENABLE ? `(Using defaults)`: '`(Customized)`')}:
;  - Wall Count: ${WALL_COUNT}
;  - Side Length: ${WALL_SIDE_LENGTH} mm
;  - Spacing: ${PATTERN_SPACING} mm
;  - Corner Angle: ${CORNER_ANGLE} degrees 
;  - Printing Direction: ${PRINT_DIR} degree
;
; Pressure Advance Stepping:
;  - ${(FIRMWARE == 'klipper' || FIRMWARE == 'rrf3' ? 'PA' : 'LA')} Start Value: ${Math.round10(PA_START, PA_round)}
;  - ${(FIRMWARE == 'klipper' || FIRMWARE == 'rrf3' ? 'PA' : 'LA')} End Value: ${PA_END}
;  - ${(FIRMWARE == 'klipper' || FIRMWARE == 'rrf3' ? 'PA' : 'LA')} Increment: ${PA_STEP}
;  - Show on LCD: ${ECHO}
;  - Number Tab: ${USE_LINENO}
${(USE_LINENO ? `;  - No Leading Zeroes: ${LINENO_NO_LEADING_ZERO}\n`: '')}\
;
; Start / End G-code:
;  - Start G-code Type: ${START_GCODE_TYPE}
;  - Hotend Temp: ${HOTEND_TEMP}C
;  - Bed Temp: ${BED_TEMP}C
;
; Calculated Values:
;  - Print Size X: ${Math.round10(FIT_WIDTH, -2)} mm
;  - Print Size Y: ${Math.round10(FIT_HEIGHT, -2)} mm
;  - Number of Patterns to Print: ${NUM_PATTERNS}
;  - ${(FIRMWARE == 'klipper' || FIRMWARE == 'rrf3' ? 'PA' : 'LA')} Values: `;
 
for (let i = 0; i < NUM_PATTERNS; i++){
  pa_script += Math.round10((PA_START + i * PA_STEP),PA_round);
  if (i != NUM_PATTERNS - 1){ // add comma separator if not last item in list
    pa_script += ', '
  }
  else {
      pa_script += '\n'
  }
}

pa_script += `\
;
; Prepare printing
; 
${(FIRMWARE == 'klipper' && EXTRUDER_NAME != '' && EXTRUDER_NAME_ENABLE ? `ACTIVATE_EXTRUDER EXTRUDER=${EXTRUDER_NAME} ; Activate extruder\n`: '')}\
${(FIRMWARE != 'klipper' && TOOL_INDEX != 0 ? `T${TOOL_INDEX} ; Activate extruder\n`: '')}\
${START_GCODE}
G21 ; Millimeter units
G90 ; Absolute XYZ
M83 ; Relative E
G92 E0 ; Reset extruder distance
;
;  Begin printing
;
M106 S${Math.round(FAN_SPEED_FIRSTLAYER * 2.55)} ${(FIRMWARE.includes('marlin') && TOOL_INDEX != 0 ? ` P${TOOL_INDEX} ` : '')}; Set fan speed
`;

if (ACCELERATION_ENABLE){
  if (FIRMWARE == 'klipper') {
    pa_script += `SET_VELOCITY_LIMIT ACCEL=${ACCELERATION} ; Set printing acceleration\n`
  } else {
    pa_script += `M204 P${ACCELERATION} ; Set printing acceleration\n`
  }
}

  // Move to layer height, set initial PA
  pa_script += doEfeed('-', basicSettings, {hop: false}) +
               moveToZ(5, basicSettings, {comment: 'Z raise'}) +
               moveTo(PAT_START_X, PAT_START_Y, basicSettings, {retract:false, hop:false, comment: 'Move to start position'}) +
               moveToZ(HEIGHT_FIRSTLAYER, basicSettings, {comment: 'Move to start layer height'}) +
               doEfeed('+', basicSettings, {hop: false})
  
  /*
  if (FIRMWARE == 'klipper'){
    pa_script += `SET_PRESSURE_ADVANCE ADVANCE=${Math.round10(PA_START, PA_round)} ${(EXTRUDER_NAME != '' ? `EXTRUDER=${EXTRUDER_NAME} ` : '')}; Set pressure advance to start value\n`;
    if (ECHO){pa_script += `M117 PA ${Math.round10(PA_START, PA_round)}\n`}
  }
  else if (FIRMWARE == 'marlin-1.1.8' || FIRMWARE == 'marlin-1.1.9'){
    pa_script += `M900 K${Math.round10(PA_START, PA_round)} ${(TOOL_INDEX != 0 ? `T${TOOL_INDEX} ` : '')}; Set linear advance k factor to start value\n`;
    if (ECHO){pa_script += `M117 LA ${Math.round10(PA_START, PA_round)}\n`}
  }
  else if (FIRMWARE == 'rrf3'){
    pa_script += `M572 S${Math.round10(PA_START, PA_round)} ${(TOOL_INDEX != 0 ? `D${TOOL_INDEX} ` : '')}; Set pressure advance to start value\n`;
    if (ECHO){pa_script += `M117 PA ${Math.round10(PA_START, PA_round)}\n`}
  }
  */

  // create anchor + line numbering frame if selected
  if (ANCHOR_OPTION == 'anchor_frame'){
    pa_script += createBox(PAT_START_X, PAT_START_Y, PRINT_SIZE_X, FRAME_SIZE_Y, basicSettings);

    if (USE_LINENO){ // create tab for numbers                                        // Set to <1 for extra overlap 
      pa_script += createBox(PAT_START_X, (PAT_START_Y + FRAME_SIZE_Y + (ANCHOR_LAYER_LINE_SPACING * 1)), GLYPH_TAB_MAX_X - PAT_START_X, calcMaxGlyphHeight(LINENO_NO_LEADING_ZERO) + ANCHOR_LAYER_LINE_SPACING + GLYPH_PADDING_VERTICAL * 2, basicSettings, {fill: true, num_perims: parseInt($('#ANCHOR_PERIMETERS').prop("defaultValue"))});
    }
  }
  else if (ANCHOR_OPTION == 'anchor_layer'){
    pa_script += createBox(PAT_START_X, PAT_START_Y, PRINT_SIZE_X, FRAME_SIZE_Y, basicSettings, {fill: true, num_perims: parseInt($('#ANCHOR_PERIMETERS').prop("defaultValue"))});
    
    if (USE_LINENO){ // create tab for numbers                                        // Set to <1 for extra overlap 
      pa_script += createBox(PAT_START_X, (PAT_START_Y + FRAME_SIZE_Y + (ANCHOR_LAYER_LINE_SPACING * 1)), GLYPH_TAB_MAX_X - PAT_START_X, calcMaxGlyphHeight(LINENO_NO_LEADING_ZERO) + ANCHOR_LAYER_LINE_SPACING + GLYPH_PADDING_VERTICAL * 2, basicSettings, {fill: true});
    }  
  }

  // draw PA pattern
  for (let i = (ANCHOR_OPTION == 'anchor_layer' ? 1 : 0); i < NUM_LAYERS ; i++){ // skip first layer if using full anchor layer

    if (i == 1){ // set new fan speed after first layer
      pa_script += `M106 S${Math.round(FAN_SPEED * 2.55)} ${(FIRMWARE.includes('marlin') && TOOL_INDEX != 0 ? ` P${TOOL_INDEX} ` : '')}; Set fan speed\n`
    }

    pa_script += moveToZ((i * HEIGHT_LAYER) + HEIGHT_FIRSTLAYER, basicSettings, {comment: 'Move to layer height'});

    // line numbering, if selected
    if (USE_LINENO){
      if ((ANCHOR_OPTION != 'no_anchor' && i == 1) || (ANCHOR_OPTION == 'no_anchor' && i == 0)){
        for (let j = 0; j < NUM_PATTERNS; j++){
          if (j % 2 == 0){ // glyph on every other line
            var THIS_GLYPH_START_X = PAT_START_X + 
                (j * (PATTERN_SPACING + LINE_WIDTH)) + 
                (j * ((WALL_COUNT - 1) * LINE_SPACING_ANGLE)); // this aligns glyph starts with first pattern perim
            THIS_GLYPH_START_X += (((WALL_COUNT - 1) / 2) * LINE_SPACING_ANGLE) -2; // shift glyph center to middle of pattern walls. 2 = half of glyph
            THIS_GLYPH_START_X += PATTERNSHIFT // adjust for pattern shift

            pa_script += createGlyphs(THIS_GLYPH_START_X, (PAT_START_Y + FRAME_SIZE_Y + GLYPH_PADDING_VERTICAL + LINE_WIDTH), basicSettings, Math.round10((PA_START + (j * PA_STEP)), PA_round), LINENO_NO_LEADING_ZERO);
          }
        }  
      }
    }

    var TO_X = PAT_START_X,
        TO_Y = PAT_START_Y

    TO_X = PAT_START_X + PATTERNSHIFT;
    TO_Y = PAT_START_Y;

    if (i == 0 && ANCHOR_OPTION == 'anchor_frame'){ // if printing first layer with a frame, shrink to fit inside frame
      var SHRINK = (ANCHOR_LAYER_LINE_SPACING * (ANCHOR_PERIMETERS - 1) + (ANCHOR_LAYER_LINE_WIDTH * (1 - ENCROACHMENT))) / Math.sin(toRadians(CORNER_ANGLE) / 2);
      var SIDE_LENGTH = WALL_SIDE_LENGTH - SHRINK; 
      TO_X += SHRINK * Math.sin(toRadians(90) - toRadians(CORNER_ANGLE) / 2);
      TO_Y += ANCHOR_LAYER_LINE_SPACING * (ANCHOR_PERIMETERS - 1) + (ANCHOR_LAYER_LINE_WIDTH * (1 - ENCROACHMENT));
    } else {
      var SIDE_LENGTH = WALL_SIDE_LENGTH;
    }

    var INITIAL_X = TO_X,
        INITIAL_Y = TO_Y;

    // move to start xy
    pa_script += moveTo(TO_X, TO_Y, basicSettings, {comment: 'Move to pattern start\n'})

    for (let j = 0; j < NUM_PATTERNS; j++){
      if (i !== 0){
        // increment pressure advance
        if (FIRMWARE == 'klipper'){
          pa_script += `SET_PRESSURE_ADVANCE ADVANCE=${Math.round10(PA_START + (j * PA_STEP), PA_round)} ${(EXTRUDER_NAME != '' ? `EXTRUDER=${EXTRUDER_NAME} ` : '')}; Set pressure advance\n`;
          if (ECHO){pa_script += `M117 PA ${Math.round10(PA_START + (j * PA_STEP), PA_round)}\n`}
        }
        else if (FIRMWARE == 'marlin-1.1.8' || FIRMWARE == 'marlin-1.1.9'){
          pa_script += `M900 K${Math.round10(PA_START + (j * PA_STEP), PA_round)} ${(TOOL_INDEX != 0 ? `T${TOOL_INDEX} ` : '')}; Set linear advance k factor\n`;
          if (ECHO){pa_script += `M117 LA ${Math.round10(PA_START + (j * PA_STEP), PA_round)}\n`}
        }
        else if (FIRMWARE == 'rrf3'){
          pa_script += `M572 S${Math.round10(PA_START + (j * PA_STEP), PA_round)} ${(TOOL_INDEX != 0 ? `D${TOOL_INDEX} ` : '')}; Set pressure advance\n`;
          if (ECHO){pa_script += `M117 PA ${Math.round10(PA_START + (j * PA_STEP), PA_round)}\n`}
        }
      }
    
      for (let k = 0; k < WALL_COUNT ; k++){
        TO_X += (Math.cos(toRadians(CORNER_ANGLE) / 2) * SIDE_LENGTH);
        TO_Y += (Math.sin(toRadians(CORNER_ANGLE) / 2) * SIDE_LENGTH);
        pa_script += createLine(TO_X, TO_Y, basicSettings, {'height': (i == 0 ? HEIGHT_FIRSTLAYER : HEIGHT_LAYER), 'speed': (i == 0 ? SPEED_FIRSTLAYER : SPEED_PERIMETER), comment: 'Print pattern wall'});

        TO_X -= Math.cos(toRadians(CORNER_ANGLE) / 2) * SIDE_LENGTH;
        TO_Y += Math.sin(toRadians(CORNER_ANGLE) / 2) * SIDE_LENGTH;
        pa_script += createLine(TO_X, TO_Y, basicSettings, {'height': (i == 0 ? HEIGHT_FIRSTLAYER : HEIGHT_LAYER), 'speed': (i == 0 ? SPEED_FIRSTLAYER : SPEED_PERIMETER), comment: 'Print pattern wall'});

        TO_Y = INITIAL_Y;
        switch (true){
          case k != WALL_COUNT - 1:  // perims not done yet. move to next perim
            TO_X += LINE_SPACING_ANGLE;
            pa_script += moveTo(TO_X, TO_Y, basicSettings, {comment: 'Move to start next pattern wall'});
            break;
          case j != NUM_PATTERNS - 1: // patterns not done yet. move to next pattern
            TO_X += (PATTERN_SPACING + LINE_WIDTH);
            pa_script += moveTo(TO_X, TO_Y, basicSettings, {comment: 'Move to next pattern'});
            break;
          case i != NUM_LAYERS - 1: // layers not done yet. move back to start
            TO_X = INITIAL_X;
            pa_script += moveTo(TO_X, TO_Y, basicSettings, {comment: 'Move back to start position'});
            break;
          default:  // everything done. break
            break;
        }
      }
    }
  }

  if (FIRMWARE == 'klipper'){
    pa_script += `SET_PRESSURE_ADVANCE ADVANCE=${Math.round10(PA_START, PA_round)} ${(EXTRUDER_NAME != '' ? `EXTRUDER=${EXTRUDER_NAME} ` : '')}; Set pressure advance back to start value\n`;
    if (ECHO){pa_script += `M117 PA ${Math.round10(PA_START, PA_round)}\n`}
  }
  else if (FIRMWARE == 'marlin-1.1.8' || FIRMWARE == 'marlin-1.1.9'){
    pa_script += `M900 K${Math.round10(PA_START, PA_round)} ${(TOOL_INDEX != 0 ? `T${TOOL_INDEX} ` : '')}; Set linear advance k factor back to start value\n`;
    if (ECHO){pa_script += `M117 LA ${Math.round10(PA_START, PA_round)}\n`}
  }
  else if (FIRMWARE == 'rrf3'){
    pa_script += `M572 S${Math.round10(PA_START, PA_round)} ${(TOOL_INDEX != 0 ? `D${TOOL_INDEX} ` : '')}; Set pressure advance back to start value\n`;
    if (ECHO){pa_script += `M117 PA ${Math.round10(PA_START, PA_round)}\n`}
  }
  pa_script += doEfeed('-', basicSettings) +
               moveToZ(CUR_Z + 5, basicSettings, {comment: 'Z raise'}) +`\
M104 S0 ; Turn off hotend
M140 S0 ; Turn off bed
M107    ; Turn off fan
;
; End G-code
;
${END_GCODE}
;
; FINISH
;
`;

  $('#gcodetextarea').val(pa_script);
}

function calcMaxGlyphHeight(removeLeadingZeroes = false){
  var sNumber = '',
      maxHeight = 0,
      curHeight = 0;

  for (let i = 0; i < NUM_PATTERNS ; i++){
    if (i % 2 == 0){
      curHeight = 0
      sNumber = (Math.round10((PA_START + (i * PA_STEP)), PA_round)).toString()
      if (removeLeadingZeroes){sNumber = sNumber.replace(/^0+\./, '.')}
      for (var j = 0; j < sNumber.length; j ++){
        if (!(sNumber.charAt(j) === '1' || sNumber.charAt(j) === '.')) {
          curHeight += 3 // glyph spacing
        }
      }
      if (curHeight > maxHeight){maxHeight = curHeight}
    }
  }
  return maxHeight;
}

// create digits for line numbering
function createGlyphs(startX, startY, basicSettings, value, removeLeadingZeroes = false) {
  var glyphSegLength = 2,
      glyphDotSize = 0.75,
      glyphSpacing = 3.0,
      totalSpacing = 0,
      glyphString = '',
      sNumber = value.toString(),
      glyphSeg = {
        '1': ['bl','right','right'],
        '2': ['bl','up','right','down','right','up'],
        '3': ['bl','up','right','down','mup','right','down'],
        '4': ['ul','right','right','mleft','down','left'],
        '5': ['ul','down','right','up','right','down'],
        '6': ['ul','down','right','right','up','left','down'],
        '7': ['bl','up','right','right'],
        '8': ['bl','right','right','up','left','left','down','mright','up'],
        '9': ['br','up','left','left','down','right','up'],
        '0': ['bl','right','right','up','left','left','down'],
        '.': ['br','dot']
      };

  if (removeLeadingZeroes){sNumber = sNumber.replace(/^0+\./, '.')} 

  for (var i = 0, len = sNumber.length; i < len; i += 1) { // loop through string chars
    for (var key in glyphSeg[sNumber.charAt(i)]) { // loop through segments corresponding to current char
      if(glyphSeg[sNumber.charAt(i)].hasOwnProperty(key)) {
        switch (true){
          case glyphSeg[sNumber.charAt(i)][key] === 'bl' :
            glyphString += moveTo(startX, startY + totalSpacing, basicSettings);
            break;
          case glyphSeg[sNumber.charAt(i)][key] === 'br' :
            glyphString += moveTo(startX + glyphSegLength * 2, startY + totalSpacing, basicSettings);
            break;
          case glyphSeg[sNumber.charAt(i)][key] === 'ul' :
            glyphString += moveTo(startX, startY + totalSpacing + glyphSegLength, basicSettings);
            break;
          case glyphSeg[sNumber.charAt(i)][key] === 'ur' :
            glyphString += moveTo(startX + glyphSegLength * 2, startY + totalSpacing + glyphSegLength, basicSettings);
            break;
          case glyphSeg[sNumber.charAt(i)][key] === 'up' :
            glyphString += createLine(CUR_X, CUR_Y + glyphSegLength, basicSettings, {'speed': basicSettings['firstLayerSpeed'], 'comment': 'Glyph: ' + sNumber.charAt(i)});
            break;
          case glyphSeg[sNumber.charAt(i)][key] === 'down' :
            glyphString += createLine(CUR_X, CUR_Y - glyphSegLength, basicSettings, {'speed': basicSettings['firstLayerSpeed'], 'comment': 'Glyph: ' + sNumber.charAt(i)});
            break;
          case glyphSeg[sNumber.charAt(i)][key] === 'right' :
            glyphString += createLine(CUR_X + glyphSegLength, CUR_Y,  basicSettings, {'speed': basicSettings['firstLayerSpeed'], 'comment': 'Glyph: ' + sNumber.charAt(i)});
            break;
          case glyphSeg[sNumber.charAt(i)][key] === 'left' :
            glyphString += createLine(CUR_X - glyphSegLength, CUR_Y, basicSettings, {'speed': basicSettings['firstLayerSpeed'], 'comment': 'Glyph: ' + sNumber.charAt(i)});
            break;
          case glyphSeg[sNumber.charAt(i)][key] === 'mup' :
            glyphString += moveTo(CUR_X, CUR_Y + glyphSegLength, basicSettings);
            break;
          case glyphSeg[sNumber.charAt(i)][key] === 'mdown' :
            glyphString += moveTo(CUR_X, CUR_Y - glyphSegLength, basicSettings);
            break;
          case glyphSeg[sNumber.charAt(i)][key] === 'mright' :
            glyphString += moveTo(CUR_X + glyphSegLength, CUR_Y, basicSettings);
            break;
          case glyphSeg[sNumber.charAt(i)][key] === 'mleft' :
            glyphString += moveTo(CUR_X - glyphSegLength, CUR_Y, basicSettings);
            break;
          case glyphSeg[sNumber.charAt(i)][key] === 'dot' :
            glyphString += createLine(CUR_X - glyphDotSize, CUR_Y, basicSettings, {speed: basicSettings['firstLayerSpeed'], extMult: basicSettings['extMult'],comment: 'Glyph: .'});
        }
      }
    }
    if (sNumber.charAt(i) === '1' || sNumber.charAt(i) === '.') {
      totalSpacing += 1
    } else {
      totalSpacing += glyphSpacing
    }
  }
  return glyphString;
}


// Save content of textarea to file using
// https://github.com/eligrey/FileSaver.js
function saveTextAsFile() {
  if (pa_script) {
    var pa_script_blob = new Blob([pa_script], {type: 'text/plain'})
    saveAs(pa_script_blob, `${$('#FILENAME').val()}.gcode`);
  } else {
    alert('Generate G-code first');
  }
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
(function() {

  /**
   * Decimal adjustment of a number.
   *
   * @param {String}  type  The type of adjustment.
   * @param {Number}  value The number.
   * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
   * @returns {Number} The adjusted value.
   */

  function decimalAdjust(type, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || Number(exp) === 0) {
      return Math[type](value);
    }
    value = Number(value);
    exp = Number(exp);
    // If the value is not a number or the exp is not an integer...
    if (value === null || isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
      return NaN;
    }
    // If the value is negative...
    if (value < 0) {
      return -decimalAdjust(type, -value, exp);
    }
    // Shift
    value = value.toString().split('e');
    value = Math[type](Number(value[0] + 'e' + (value[1] ? (Number(value[1]) - exp) : -exp)));
    // Shift back
    value = value.toString().split('e');
    return Number(value[0] + 'e' + (value[1] ? (Number(value[1]) + exp) : exp));
  }

  // Decimal round
  if (!Math.round10) {
    Math.round10 = function(value, exp) {
      return decimalAdjust('round', value, exp);
    };
  }
  // Decimal floor
  if (!Math.floor10) {
    Math.floor10 = function(value, exp) {
      return decimalAdjust('floor', value, exp);
    };
  }
  // Decimal ceil
  if (!Math.ceil10) {
    Math.ceil10 = function(value, exp) {
      return decimalAdjust('ceil', value, exp);
    };
  }
}());

// get the number of decimal places of a float
function getDecimals(num) {
  var match = (String(num)).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  if (!match) {
    return num;
  }
  var decimalPlaces = Math.max(0, (match[1] ? match[1].length : 0) - (match[2] ? Number(match[2]) : 0));
  return decimalPlaces;
}

// convert degrees to radians
function toRadians(degrees){
  return degrees * (Math.PI / 180);
}

// return distance between two point
function getDistance(cur_x, cur_y, to_x, to_y){
  return Math.hypot((to_x - cur_x), (to_y - cur_y));
}

// print a line between current position and target
function createLine(to_x, to_y, basicSettings, optional) {
  var ext = 0,
      length = 0,
      gcode = '';

  //handle optional function arguments passed as object
  var defaults = {
    extMult: basicSettings['extMult'],
    height: basicSettings['layerHeight'],
    lineWidth: basicSettings['lineWidth'],
    speed: basicSettings['perimSpeed'],
    comment: 'Print line'
  };
  var optArgs = $.extend({}, defaults, optional);

  // change speed if first layer
  if (Math.round10(CUR_Z, Z_round) == basicSettings['firstLayerHeight']){
    optArgs['speed'] = basicSettings['firstLayerSpeed'];
  } else {
    optArgs['speed'] = basicSettings['perimSpeed'];
  }

  length = getDistance(CUR_X, CUR_Y, to_x, to_y);

  var extArea = ((optArgs['lineWidth'] - optArgs['height']) * optArgs['height']) + (Math.PI * Math.pow((optArgs['height'] / 2), 2)) // cross sectional area of extrusion
  var vol = length * extArea // total volume of extrusion
  var filArea = Math.PI * Math.pow((basicSettings['filamentDiameter'] / 2), 2) // cross sectional area of filament
  ext = Math.round10((vol / filArea) * optArgs['extMult'], EXT_round) // volume to filament length

  gcode += `G1 X${Math.round10(rotateX(to_x, basicSettings['centerX'], to_y, basicSettings['centerY'], basicSettings['printDir']), XY_round)} Y${Math.round10(rotateY(to_x, basicSettings['centerX'], to_y, basicSettings['centerY'], basicSettings['printDir']), XY_round)} E${ext} F${optArgs['speed']} ; ${optArgs['comment']}\n`

  CUR_X = to_x, // update global position vars
  CUR_Y = to_y;

  return gcode;
}

// move print head to coordinates
function moveTo(to_x, to_y, basicSettings, optional) {
  var gcode = '',
    distance = getDistance(CUR_X, CUR_Y, to_x, to_y);

  var defaults = {
    comment: 'Move',
    hop: basicSettings['zhopEnable'],
    retract: true
  };
  var optArgs = $.extend({}, defaults, optional);

  if (to_x != CUR_X || to_y != CUR_Y){ // don't do anything if we're already there

    if(distance > 2 && optArgs['retract']){ // don't retract for travels under 2mm
      gcode += doEfeed('-', basicSettings, {hop: optArgs['hop']}); //retract
    }
    gcode += `G0 X${Math.round10(rotateX(to_x, basicSettings['centerX'], to_y, basicSettings['centerY'], basicSettings['printDir']), XY_round)} Y${Math.round10(rotateY(to_x, basicSettings['centerX'], to_y, basicSettings['centerY'], basicSettings['printDir']), XY_round)} F${basicSettings['moveSpeed']} ; ${optArgs['comment']}\n`

    CUR_X = to_x, // update global position vars
    CUR_Y = to_y;

    if(distance > 2 && optArgs['retract']){
      gcode += doEfeed('+', basicSettings, {hop: optArgs['hop']});  //unretract
    }
  }
     
  return gcode;
}

function moveToZ(to_z, basicSettings, optional){
  var gcode = '';

  var defaults = {
    comment: 'Move to Z'
  };
  var optArgs = $.extend({}, defaults, optional);

  gcode += `G0 Z${Math.round10(to_z, Z_round)} F${basicSettings['moveSpeed']} ; ${optArgs['comment']}\n`
  CUR_Z = to_z; // update global position var
  return gcode;
}

// create retract / un-retract gcode
function doEfeed(dir, basicSettings, optional) {
  var gcode = '';

  var defaults = {
    hop: basicSettings['zhopEnable']
  };
  var optArgs = $.extend({}, defaults, optional);

  if (dir === '-'){
    if (!RETRACTED){
      gcode += `G1 E-${Math.round10(basicSettings['retractDist'], EXT_round)} F${basicSettings['retractSpeed']} ; Retract\n`;
      RETRACTED = true
    }
    if (optArgs['hop'] && !HOPPED){
      gcode += `G1 Z${Math.round10((CUR_Z + basicSettings['zhopHeight']), Z_round)} F${basicSettings['moveSpeed']} ; Z hop\n`
      HOPPED = true
    }
  } else if (dir === '+') {
    if (HOPPED){ // always return hop on unretract
      gcode += `G1 Z${Math.round10(CUR_Z, Z_round)} F${basicSettings['moveSpeed']} ; Z hop return\n`
      HOPPED = false
    }    
    if (RETRACTED){
      gcode += `G1 E${Math.round10(basicSettings['retractDist'], EXT_round)} F${basicSettings['unretractSpeed']} ; Un-retract\n`
      RETRACTED = false
    }
  }

  return gcode;
}

// draw perimeter, move inwards, repeat
function createBox(min_x, min_y, size_x, size_y, basicSettings, optional){
  var gcode = '',
      x = min_x,
      y = min_y,
      max_x = min_x + size_x,
      max_y = min_y + size_y;

  //handle optional function arguments passed as object
  var defaults = {
    fill: false,
    num_perims: basicSettings['anchorPerimeters'],
    height: basicSettings['firstLayerHeight'],
    lineWidth: basicSettings['anchorLineWidth'],
    speed: basicSettings['firstLayerSpeed'],
  };

  var optArgs = $.extend({}, defaults, optional);

  var spacing = optArgs['lineWidth'] - optArgs['height'] * (1 - Math.PI / 4);

  // if number of perims exceeds size of box, reduce it to max
  var maxPerims = Math.min( // this is the equivalent of number of perims for concentric fill
                            Math.floor((size_x * Math.sin(toRadians(45))) / (spacing / Math.sin(toRadians(45)))),
                            Math.floor((size_y * Math.sin(toRadians(45))) / (spacing / Math.sin(toRadians(45))))
                          ); 
  optArgs['num_perims'] = Math.min(optArgs['num_perims'], maxPerims)
  
  gcode += moveTo(min_x, min_y, basicSettings, {comment: 'Move to box start'});
1
  for (let i = 0; i < optArgs['num_perims'] ; i++){
    if (i != 0){ // after first perimeter, step inwards to start next perimeter
      x += spacing;
      y += spacing;
      gcode += moveTo(x, y, basicSettings, {comment: 'Step inwards to print next perimeter'})
    }
    // draw line up
    y += size_y - (i * spacing) * 2;
    gcode += createLine(x, y, basicSettings, {height: optArgs['height'], lineWidth: optArgs['lineWidth'], speed: optArgs['speed'], comment: 'Draw perimeter (up)'});
    // draw line right
    x += size_x - (i * spacing) * 2;
    gcode += createLine(x, y, basicSettings, {height: optArgs['height'], lineWidth: optArgs['lineWidth'], speed: optArgs['speed'], comment: 'Draw perimeter (right)'});
    // draw line down
    y -= size_y - (i * spacing) * 2;
    gcode += createLine(x, y, basicSettings, {height: optArgs['height'], lineWidth: optArgs['lineWidth'], speed: optArgs['speed'], comment: 'Draw perimeter (down)'});
    // draw line left
    x -= size_x - (i * spacing) * 2;
    gcode += createLine(x, y, basicSettings, {height: optArgs['height'], lineWidth: optArgs['lineWidth'], speed: optArgs['speed'], comment: 'Draw perimeter (left)'});
  }

  if (optArgs['fill']){
    const spacing_45 = spacing / Math.sin(toRadians(45)),
          xMinBound = min_x + ((spacing * (optArgs['num_perims'] - 1)) + (optArgs['lineWidth'] * (1 - basicSettings['encroachment']))),
          xMaxBound = max_x - ((spacing * (optArgs['num_perims'] - 1)) + (optArgs['lineWidth'] * (1 - basicSettings['encroachment']))),
          yMinBound = min_y + ((spacing * (optArgs['num_perims'] - 1)) + (optArgs['lineWidth'] * (1 - basicSettings['encroachment']))),
          yMaxBound = max_y - ((spacing * (optArgs['num_perims'] - 1)) + (optArgs['lineWidth'] * (1 - basicSettings['encroachment']))),
          xCount = Math.floor((xMaxBound - xMinBound) / spacing_45),
          yCount = Math.floor((yMaxBound - yMinBound) / spacing_45);
    
    var xRemainder = (xMaxBound - xMinBound) % spacing_45,
        yRemainder = (yMaxBound - yMinBound) % spacing_45;

    x = xMinBound
    y = yMinBound
    gcode += moveTo(x, y, basicSettings, {comment: 'Move to fill start'}) // move to start

    for (let i = 0; i < yCount + xCount + (xRemainder + yRemainder >= spacing_45 ? 1 : 0); i++){ // this isn't the most robust way, but less expensive than finding line intersections
      if (i < Math.min(yCount, xCount)){
        if (i % 2 == 0){
          x += spacing_45
          y = yMinBound
          gcode += moveTo(x, y, basicSettings, {speed: optArgs['speed']}) // step right
          y += (x - xMinBound)
          x = xMinBound
          gcode += createLine(x, y, basicSettings, {height: optArgs['height'], lineWidth: optArgs['lineWidth'], speed: optArgs['speed'], comment: 'Fill'}) // print up/left
        } else {
          y += spacing_45
          x = xMinBound
          gcode += moveTo(x, y, basicSettings, {speed: optArgs['speed']}) // step up
          x += (y - yMinBound)
          y = yMinBound
          gcode += createLine(x, y, basicSettings, {height: optArgs['height'], lineWidth: optArgs['lineWidth'], speed: optArgs['speed'], comment: 'Fill'}) // print down/right
        }
      } else if (i < Math.max(xCount,yCount)){
        if (xCount > yCount){ // if box is wider than tall
          if (i % 2 == 0){
            x += spacing_45
            y = yMinBound
            gcode += moveTo(x, y, basicSettings, {speed: optArgs['speed']}) // step right
            x -= yMaxBound - yMinBound
            y = yMaxBound
            gcode += createLine(x, y, basicSettings, {height: optArgs['height'], lineWidth: optArgs['lineWidth'], speed: optArgs['speed'], comment: 'Fill'}) // print up/left
          } else {
            if (i == yCount){
              x += (spacing_45 - yRemainder)
              yRemainder = 0
            } else {
              x += spacing_45
            }
            y = yMaxBound
            gcode += moveTo(x, y, basicSettings, {speed: optArgs['speed']}) // step right
            x += yMaxBound - yMinBound
            y = yMinBound
            gcode += createLine(x, y, basicSettings, {height: optArgs['height'], lineWidth: optArgs['lineWidth'], speed: optArgs['speed'], comment: 'Fill'}) // print down/right
          }
        } else { // if box is taller than wide
          if (i % 2 == 0){
            x = xMaxBound;
            if (i == xCount){
              y += (spacing_45 - xRemainder) 
              xRemainder = 0
            } else {
              y += spacing_45
            }
            gcode += moveTo(x, y, basicSettings, {speed: optArgs['speed']}) // step up
            x = xMinBound
            y += xMaxBound - xMinBound
            gcode += createLine(x, y, basicSettings, {height: optArgs['height'], lineWidth: optArgs['lineWidth'], speed: optArgs['speed'], comment: 'Fill'}) // print up/left
          } else {
            x = xMinBound
            y += spacing_45
            gcode += moveTo(x, y, basicSettings, {speed: optArgs['speed']}) // step up
            x = xMaxBound
            y -= xMaxBound - xMinBound
            gcode += createLine(x, y, basicSettings, {height: optArgs['height'], lineWidth: optArgs['lineWidth'], speed: optArgs['speed'], comment: 'Fill'}) // print down/right
          }
        }
      } else {
        if (i % 2 == 0){
          x = xMaxBound;
          if (i == xCount){
            y += (spacing_45 - xRemainder)
          } else {
            y += spacing_45
          }
          gcode += moveTo(x, y, basicSettings, {speed: optArgs['speed']}) // step up
          x -= (yMaxBound - y)
          y = yMaxBound
          gcode += createLine(x, y, basicSettings, {height: optArgs['height'], lineWidth: optArgs['lineWidth'], speed: optArgs['speed'], comment: 'Fill'}) // print up/left
        } else {
          if (i == yCount){
            x += (spacing_45 - yRemainder)
          } else {
            x += spacing_45
          }
          y = yMaxBound;
          gcode += moveTo(x, y, basicSettings, {speed: optArgs['speed']}) // step right
          y -= (xMaxBound - x)
          x = xMaxBound
          gcode += createLine(x, y, basicSettings, {height: optArgs['height'], lineWidth: optArgs['lineWidth'], speed: optArgs['speed'], comment: 'Fill'}) // print down/right
        }
      }
    }
  }
  return gcode;
}

// rotate x around a defined center xm, ym
function rotateX(x, xm, y, ym, a) {
  a = toRadians(a); // Convert to radians
  var cos = Math.cos(a),
      sin = Math.sin(a);

  // Subtract midpoints, so that midpoint is translated to origin
  // and add it in the end again
  //var xr = (x - xm) * cos - (y - ym) * sin + xm; //CCW
  var xr = (cos * (x - xm)) + (sin * (y - ym)) + xm; //CW
  return xr;
}


// rotate y around a defined center xm, ym
function rotateY(x, xm, y, ym, a) {
  a = toRadians(a); // Convert to radians
  var cos = Math.cos(a),
      sin = Math.sin(a);

  // Subtract midpoints, so that midpoint is translated to origin
  // and add it in the end again
  //var yr = (x - xm) * sin + (y - ym) * cos + ym; //CCW
  var yr = (cos * (y - ym)) - (sin * (x - xm)) + ym; //CW
  return yr;
}

// save current settings as localStorage object
function setLocalStorage() {
  var settings = {
    'SETTINGS_VERSION': SETTINGS_VERSION,
    'ACCELERATION' : parseInt($('#ACCELERATION').val()),
    'ACCELERATION_ENABLE' : $('#ACCELERATION_ENABLE').prop('checked'),
    'ANCHOR_LAYER_LINE_RATIO' : parseFloat($('#ANCHOR_LAYER_LINE_RATIO').val()),
    'ANCHOR_OPTION' : $('#ANCHOR_OPTION').val(),
    'BED_SHAPE' : $('#BED_SHAPE').val(),
    'BED_TEMP' : parseInt($('#BED_TEMP').val()),
    'BED_X' : parseInt($('#BED_X').val()),
    'BED_Y' : parseInt($('#BED_Y').val()),
    'ECHO' : $('#ECHO').prop('checked'),
    'END_GCODE' : $('#END_GCODE').val(),
    'EXPERT_MODE' : $('#EXPERT_MODE').prop('checked'),
    'EXTRUDER_NAME' : $('#EXTRUDER_NAME').val(),
    'EXTRUDER_NAME_ENABLE' : $('#EXTRUDER_NAME_ENABLE').prop('checked'),
    'EXT_MULT' : parseFloat($('#EXT_MULT').val()),
    'FAN_SPEED' : parseFloat($('#FAN_SPEED').val()),
    'FAN_SPEED_FIRSTLAYER' : parseFloat($('#FAN_SPEED_FIRSTLAYER').val()),
    'FILAMENT_DIAMETER' : parseFloat($('#FILAMENT_DIAMETER').val()),
    'FILENAME' : $('#FILENAME').val(),
    'FIRMWARE' : $('#FIRMWARE').val(),
    'HEIGHT_FIRSTLAYER' : parseFloat($('#HEIGHT_FIRSTLAYER').val()),
    'HEIGHT_LAYER' : parseFloat($('#HEIGHT_LAYER').val()),
    'NUM_LAYERS' : parseFloat($('#NUM_LAYERS').val()),
    'HOTEND_TEMP' : parseInt($('#HOTEND_TEMP').val()),
    'LINE_RATIO' : parseFloat($('#LINE_RATIO').val()),
    'LINENO_NO_LEADING_ZERO' : $('#LINENO_NO_LEADING_ZERO').prop('checked'),
    'NOZZLE_DIAMETER' : parseFloat($('#NOZZLE_DIAMETER').val()),
    'ORIGIN_CENTER' : $('#ORIGIN_CENTER').prop('checked'),
    'CORNER_ANGLE' : parseFloat($('#CORNER_ANGLE').val()),
    'PATTERN_OPTIONS_ENABLE' : $('#PATTERN_OPTIONS_ENABLE').prop('checked'),
    'WALL_SIDE_LENGTH' : parseFloat($('#WALL_SIDE_LENGTH').val()),
    'PATTERN_SPACING' : parseFloat($('#PATTERN_SPACING').val()),
    'PA_END' : parseFloat($('#PA_END').val()),
    'PA_START' : parseFloat($('#PA_START').val()),
    'PA_STEP' : parseFloat($('#PA_STEP').val()),
    'WALL_COUNT' : parseFloat($('#WALL_COUNT').val()),
    'PRINT_DIR' : $('#PRINT_DIR').val(),
    'RETRACT_DIST' : parseFloat($('#RETRACT_DIST').val()),
    'SPEED_FIRSTLAYER' : parseInt($('#SPEED_FIRSTLAYER').val()),
    'SPEED_PERIMETER' : parseInt($('#SPEED_PERIMETER').val()),
    'SPEED_RETRACT' : parseInt($('#SPEED_RETRACT').val()),
    'SPEED_TRAVEL' : parseInt($('#SPEED_TRAVEL').val()),
    'SPEED_UNRETRACT' : parseInt($('#SPEED_UNRETRACT').val()),
    'START_GCODE' : $('#START_GCODE').val(),
    'START_GCODE_TYPE' : $('#START_GCODE_TYPE').val(),
    'TOOL_INDEX' : parseInt($('#TOOL_INDEX').val()),
    'USE_LINENO' : $('#USE_LINENO').prop('checked'),
    'ZHOP_ENABLE' : $('#ZHOP_ENABLE').prop('checked'),
    'ZHOP_HEIGHT' : parseFloat($('#ZHOP_HEIGHT').val()),
  };

  const lsSettings = JSON.stringify(settings);
  window.localStorage.setItem('PA_SETTINGS', lsSettings);
}

// toggle between round and rectangular bed shape
function toggleBedShape() {
  if ($('#BED_SHAPE').val() === 'Round') {
    $('label[for=BED_X]').text('Bed Diameter:');
    $('label[for=BED_Y]').css({opacity: 0});
    $('#BED_Y').parent().css({opacity: 0});
    $('#BED_Y').prop('disabled', true);
    $('#ORIGIN_CENTER').prop('disabled', true);
    $('#ORIGIN_CENTER').parent().css({opacity: 0});
    $('label[for=ORIGIN_CENTER]').parent().css({opacity: 0});
  } else {
    $('label[for=\'BED_X\']').text('Bed Size X');
    $('label[for=BED_Y]').css({opacity: 1});
    $('#BED_Y').parent().css({opacity: 1});
    $('#BED_Y').prop('disabled', false);
    if ($('#EXPERT_MODE').is(':checked')){
    $('#ORIGIN_CENTER').prop('disabled', false);
    $('#ORIGIN_CENTER').parent().css({opacity: 1});
    $('label[for=ORIGIN_CENTER]').parent().css({opacity: 1});
    }
  }
}

function toggleStartEndGcode(){
  var CANNED_GCODE = {};

  CANNED_GCODE["klipper"] = `\
G28                 ; Home all axes !Don't modify/delete, only move!
G90                 ; Use absolute positioning
G1 Z5 F100          ; Z raise
M190 S[BED_TEMP]    ; Set & wait for bed temp. !Don't modify/delete, only move!
M109 S[HOTEND_TEMP] ; Set & wait for hotend temp. !Don't modify/delete, only move!
;G32                ; Tramming macro (uncomment if used)
;QUAD_GANTRY_LEVEL  ; Level flying gantry (uncomment if used)
;Z_TILT_ADJUST      ; Tilt level bed (uncomment if used)
G28 Z               ; Home Z
;BED_MESH_CALIBRATE ; Generate bed mesh (uncomment if used)`

  CANNED_GCODE["rrf3"] = `\
G28                 ; Home all axes !Don't modify/delete, only move!
G90                 ; Absolute XYZ
G1 Z5 F100          ; Z raise
M190 S[BED_TEMP]    ; Set & wait for bed temp. !Don't modify/delete, only move!
M109 S[HOTEND_TEMP] ; Set & wait for hotend temp. !Don't modify/delete, only move!
G32                 ; Run bed.g macro
G28 Z               ; Home Z`

  var STANDALONE_MACRO = {};

  STANDALONE_MACRO["klipper"] = `\
M190 S[BED_TEMP]    ; Set & wait for bed temp. !Don't modify/delete, only move!
M109 S[HOTEND_TEMP] ; Set & wait for hotend temp. !Don't modify/delete, only move!
PRINT_START         ; Start macro
;
; Make sure this macro name matches your own! 
; (For example, some may use START_PRINT instead.)`

  STANDALONE_MACRO["rrf3"] = `\
M190 S[BED_TEMP]          ; Set & wait for bed temp. !Don't modify/delete, only move!
M109 S[HOTEND_TEMP]       ; Set & wait for hotend temp. !Don't modify/delete, only move!
M98 P"/sys/print_start.g" ; Start macro
;
; Make sure this macro name matches your own!
;`

  var STANDALONE_TEMP_PASSING_MACRO = {};
  
  STANDALONE_TEMP_PASSING_MACRO["klipper"] = `\
PRINT_START HOTEND=[HOTEND_TEMP] BED=[BED_TEMP] CHAMBER=40 ; Start macro w/ temp params. Keep the variables!
;
; - Make sure the macro name AND parameter names match YOUR start macro setup!
;     (For example, some macros use EXTRUDER=X rather than HOTEND=X, or START_PRINT instead of PRINT_START)!
; - Replace any slicer variables with those listed above! It should look like the top example, !!! NOT !!! like this:
;     PRINT_START BED=[first_layer_bed_temperature](...)`

  STANDALONE_TEMP_PASSING_MACRO["rrf3"] = `\
M98 P"/sys/print_start.g" E[HOTEND_TEMP] B[BED_TEMP] ; Start macro w/ temp params. Keep the variables!
;
; - Make sure the macro name AND parameter names match YOUR start macro setup!
; - Replace any slicer variables with those listed above! It should look like the top example, !!! NOT !!! like this:
;     M98 P"/sys/print_start.g" B=[first_layer_bed_temperature](...)`

  var MARLIN_GCODE = `\
G28                 ; Home all axes !Don't modify/delete, only move!
G90                 ; Absolute XYZ
G1 Z5 F100          ; Z raise
M190 S[BED_TEMP]    ; Set & wait for bed temp !Don't modify/delete, only move!
M109 S[HOTEND_TEMP] ; Set & wait for hotend temp !Don't modify/delete, only move!
;G29                ; Auto bed leveling`

  switch (true){
    case $('#START_GCODE_TYPE').val() == "custom" :
      $('#START_GCODE').val(CANNED_GCODE[$('#FIRMWARE').val()]);
      break;
    case $('#START_GCODE_TYPE').val() == "custom-marlin" :
      $('#START_GCODE').val(MARLIN_GCODE);
      break;
    case $('#START_GCODE_TYPE').val() == "standalone" :
      $('#START_GCODE').val(STANDALONE_MACRO[$('#FIRMWARE').val()]);
      break;
    case $('#START_GCODE_TYPE').val() == 'standalone_temp_passing' :
      $('#START_GCODE').val(STANDALONE_TEMP_PASSING_MACRO[$('#FIRMWARE').val()]);
      break;
  }
  validate();
}

function toggleStartEndGcodeTypeDescriptions(){
    if ($('#START_GCODE_TYPE').val() == "custom"){
    $('#START_GCODE_TYPE_Description').html('');
  } else if ($('#START_GCODE_TYPE').val() == "standalone") {
    $('#START_GCODE_TYPE_Description').html(`\
<br>This option is for if you use a <b>standalone</b> start macro.<br><br>
It must contain <strong>all necessary preparatory g-codes!</strong><br>
(homing, quad gantry leveling, z offset, bed leveling, etc).<br><br>`);
  } else if ($('#START_GCODE_TYPE').val() == "standalone_temp_passing") {
    $('#START_GCODE_TYPE_Description').html(`\
<br>This option is for if you use a <b>standalone</b> start macro <strong>AND</strong> <a href=\"https://ellis3dp.com/Print-Tuning-Guide/articles/passing_slicer_variables.html\"><u>have set up temperature variable passing!</u></a></p>
It must contain <strong>all necessary preparatory g-codes!</strong><br>
(homing, quad gantry leveling, z offset, bed leveling, etc).<br><br>`);
  } else {
    $('#START_GCODE_TYPE_Description').html('');
  }
}

function toggleAcceleration(){
  if ($('#ACCELERATION_ENABLE').is(':checked')){
    $('#ACCELERATION').prop('disabled', false);
    if ($('#ACCELERATION').val() == ''){
      $('#ACCELERATION').val(1000)
    }
  } else {
    //$('#ACCELERATION').val('')
    $('#ACCELERATION').prop('disabled', true);
  }
}

function toggleExtruderName(){
  if ($('#EXTRUDER_NAME_ENABLE').is(':checked')){
    $('#EXTRUDER_NAME').prop('disabled', false);
  } else {
    $('#EXTRUDER_NAME').prop('disabled', true);
  }
}

function toggleExpertMode(){
  if ($('#EXPERT_MODE').is(':checked')){
    $('#ORIGIN_CENTER').parents().eq(1).show()
    $('#NUM_LAYERS').parents().eq(1).show()
    $('#LINE_RATIO').parents().eq(1).show()
    $('#patternSettingsHead').show()
    $('#USE_LINENO').parents().eq(1).show()
    $('label[for=ECHO]').parent().css({opacity: 1});
    $('#ECHO').parent().css({opacity: 1});
    toggleAnchorOptions();
    toggleFirmwareOptions();
  } else {
    $('#ORIGIN_CENTER').parents().eq(1).hide()
    $('#NUM_LAYERS').parents().eq(1).hide()
    $('#LINE_RATIO').parents().eq(1).hide()
    $("#PATTERN_OPTIONS_ENABLE").prop( "checked", false );
    togglePatternOptions();
    $('#patternSettingsHead').hide()
    $('#USE_LINENO').parents().eq(1).hide()
    $('label[for=ECHO]').parent().css({opacity: 0});
    $('#ECHO').parent().css({opacity: 0});
    $('label[for=ANCHOR_PERIMETERS]').parent().hide();
    $('#ANCHOR_PERIMETERS').parent().hide();
    $('label[for=ANCHOR_LAYER_LINE_RATIO]').parent().hide();
    $('#ANCHOR_LAYER_LINE_RATIO').parent().hide();
  }

  validate(true);
}

function toggleFirmwareOptions(){
  var RRF3_END_GCODE = `\
M0    ; Stop`

  var MARLIN_END_GCODE = `\
M501    ; Load settings from EEPROM (to restore previous values)`

  var KLIPPER_END_GCODE = `\
PRINT_END ; End macro. Change name to match yours`

  switch(true){
    case $('#FIRMWARE').val() == ('klipper') :
      $('label[for=TOOL_INDEX').parent().hide()
      $('#TOOL_INDEX').parent().hide()
      if ($('#EXPERT_MODE').is(':checked')){
        $('label[for=EXTRUDER_NAME').parent().show()
        $('#EXTRUDER_NAME').parent().show()
      }
      $('#STEPPING_HEADER').html('Pressure Advance Stepping')
      $('#STEPPING_HEADER_BODY').html(`\
<i>Direct Drive: Start with ~0 to ~0.08 @ 0.005 increment<br>
Bowden: Start with ~0 to ~1* @ 0.05 increment<br>
<sup>*Long bowden paths can sometimes need higher than 1</sup><br></i>
Once you find a general range, run again with narrower range / finer increment.<br>`)
      $('label[for=PA_START]').html('PA Start Value')
      $('label[for=PA_END]').html('PA End Value')
      $('label[for=PA_STEP]').html('PA Increment')
      $('#START_GCODE_TYPE').parents().eq(1).show()
      $('#END_GCODE').val(KLIPPER_END_GCODE);
      break;
    case $('#FIRMWARE').val() == ('marlin-1.1.9') :
      if ($('#EXPERT_MODE').is(':checked')){
        $('label[for=TOOL_INDEX').parent().show()
        $('#TOOL_INDEX').parent().show()
      }
      $('label[for=EXTRUDER_NAME').parent().hide()
      $('#EXTRUDER_NAME').parent().hide()
      $('#STEPPING_HEADER').html('Linear Advance Stepping')
      $('#STEPPING_HEADER_BODY').html(`\
<i>Direct Drive: Start with ~0 to ~0.08 @ 0.005 increment<br>
Bowden: Start with ~0 to ~1* @ 0.05 increment<br>
<sup>*Long bowden paths can sometimes need higher than 1</sup><br></i>
Once you find a general range, run again with narrower range / finer increment.<br>`)
      $('label[for=PA_START]').html('Start K Value')
      $('label[for=PA_END]').html('End K Value')
      $('label[for=PA_STEP]').html('K Value Increment')
      $('#START_GCODE_TYPE').parents().eq(1).hide()
      $('#END_GCODE').val(MARLIN_END_GCODE);
      break;
    case $('#FIRMWARE').val() == ('marlin-1.1.8') :
      if ($('#EXPERT_MODE').is(':checked')){
        $('label[for=TOOL_INDEX').parent().show()
        $('#TOOL_INDEX').parent().show()
      }
      $('label[for=EXTRUDER_NAME').parent().hide()
      $('#EXTRUDER_NAME').parent().hide()
      $('#STEPPING_HEADER').html('Linear Advance Stepping')
      $('#STEPPING_HEADER_BODY').html(``)
      $('label[for=PA_START]').html('Start K Value')
      $('label[for=PA_END]').html('End K Value')
      $('label[for=PA_STEP]').html('K Value Increment')
      $('#START_GCODE_TYPE').parents().eq(1).hide()
      $('#END_GCODE').val(MARLIN_END_GCODE);
      break;
    case $('#FIRMWARE').val() == ('rrf3') :
      if ($('#EXPERT_MODE').is(':checked')){
        $('label[for=TOOL_INDEX').parent().show()
        $('#TOOL_INDEX').parent().show()
      }
      $('label[for=EXTRUDER_NAME').parent().hide()
      $('#EXTRUDER_NAME').parent().hide()
      $('#STEPPING_HEADER').html('Pressure Advance Stepping')
      $('#STEPPING_HEADER_BODY').html(`\
<i>Direct Drive: Start with ~0 to ~0.08 @ 0.005 increment<br>
Bowden: Start with ~0 to ~1* @ 0.05 increment<br>
<sup>*Long bowden paths can sometimes need higher than 1</sup><br></i>
Once you find a general range, run again with narrower range / finer increment.<br>`)
      $('label[for=PA_START]').html('PA Start Value')
      $('label[for=PA_END]').html('PA End Value')
      $('label[for=PA_STEP]').html('PA Increment')
      $('#START_GCODE_TYPE').parents().eq(1).show()
      $('#END_GCODE').val(RRF3_END_GCODE);
      break;
  }
}

function toggleFirmwareValues(){
    switch(true){
    case $('#FIRMWARE').val() === 'marlin-1.1.9' :
      $('#PA_START').val(0)
      $('#PA_END').val(0.08)
      $('#PA_STEP').val(0.005)
      $('#START_GCODE_TYPE').val('custom-marlin')
      break;
    case $('#FIRMWARE').val() === 'marlin-1.1.8' :
      $('#PA_START').val(0)
      $('#PA_END').val(4)
      $('#PA_STEP').val(0.2)
      $('#START_GCODE_TYPE').val('custom-marlin')
      break;
    case $('#FIRMWARE').val() === 'klipper' :
      $('#START_GCODE_TYPE').val('standalone');
      $('#PA_START').val(0)
      $('#PA_END').val(0.08)
      $('#PA_STEP').val(0.005)
      break;
    case $('#FIRMWARE').val() === 'rrf3' :
      $('#START_GCODE_TYPE').val('custom');
      $('#PA_START').val(0)
      $('#PA_END').val(0.08)
      $('#PA_STEP').val(0.005)
      break;
  }
  validate(true);
}

function togglePatternOptions(){
  for (var i = 1; i < $('#patternSettingsHead').children().length; i++) {
    if ($('#PATTERN_OPTIONS_ENABLE').is(':checked')) {
      $('#patternSettingsHead').children().eq(i).show()
    } else {
      $('#patternSettingsHead').children().eq(i).hide()
    }
  }
}

function toggleAnchorOptions(){
  
    if ($('#ANCHOR_OPTION').val() == "anchor_frame"){
      if ($('#EXPERT_MODE').is(':checked')){
        $('label[for=ANCHOR_PERIMETERS]').parent().show();
        $('#ANCHOR_PERIMETERS').parent().show();
        $('label[for=ANCHOR_LAYER_LINE_RATIO]').parent().show();
        $('#ANCHOR_LAYER_LINE_RATIO').parent().show();
      }
      $('#anchorOptionDescription').html('<img style="width: auto; max-height: 150px;" src="./images/anchor_frame.png" alt="Anchor Frame" />')
    } else if ($('#ANCHOR_OPTION').val() == "anchor_layer") {
      if ($('#EXPERT_MODE').is(':checked')){
        $('label[for=ANCHOR_PERIMETERS]').parent().hide();
        $('#ANCHOR_PERIMETERS').parent().hide();
        $('label[for=ANCHOR_LAYER_LINE_RATIO]').parent().show();
        $('#ANCHOR_LAYER_LINE_RATIO').parent().show();
      }
      $('#anchorOptionDescription').html('<img style="width: auto; max-height: 150px;" src="./images/anchor_layer.png" alt="Anchor Layer" />')
    } else {
      $('label[for=ANCHOR_PERIMETERS]').parent().hide();
      $('#ANCHOR_PERIMETERS').parent().hide();
      $('label[for=ANCHOR_LAYER_LINE_RATIO]').parent().hide();
      $('#ANCHOR_LAYER_LINE_RATIO').parent().hide();
      $('#anchorOptionDescription').html('<img style="width: auto; max-height: 150px;" src="./images/no_anchor.png" alt="No Anchor" />')
    }
}

function toggleZHop() {
  if ($('#ZHOP_ENABLE').is(':checked')) {
    $('label[for=ZHOP_HEIGHT]').parent().show();
    $('#ZHOP_HEIGHT').parent().show();
  } else {
    $('label[for=ZHOP_HEIGHT]').parent().hide();
    $('#ZHOP_HEIGHT').parent().hide();
  }
}

function toggleLeadingZero() {
  if ($('#USE_LINENO').is(':checked')) {
    $('label[for=LINENO_NO_LEADING_ZERO]').parent().show();
    $('#LINENO_NO_LEADING_ZERO').parent().show();
  } else {
    $('label[for=LINENO_NO_LEADING_ZERO]').parent().hide();
    $('#LINENO_NO_LEADING_ZERO').parent().hide();
  }
}

// show the calculated values at the bottom of the form
function displayCalculatedValues(action = 'show'){
  var body='';

  if (action == 'show'){
    body += `\
<strong>Print size X: </strong> ${Math.round10(FIT_WIDTH, -1)}mm<br>
<strong>Print size Y: </strong> ${Math.round10(FIT_HEIGHT, -1)}mm<br>
<strong>Pattern count: </strong> ${NUM_PATTERNS}<br>
<strong>${(FIRMWARE === 'klipper' || FIRMWARE === 'rrf3') ? 'PA' : 'LA'} values: </strong>`
    for (let i = 0; i < NUM_PATTERNS; i++){
      body += `${Math.round10((PA_START + i * PA_STEP),PA_round)}`;
      if (i != NUM_PATTERNS - 1){ // add comma separator if not last item in list
        body += ', '; 
      }
      else {
         body += '<br><br>';
      }
    }

    $('#information').html(body);
    $('#information').parent().show();
  } else {
    body = '';
    $('#information').html('');
    $('#information').parent().hide();
  }
}

// https://github.com/aligator/gcode-viewer
function render(gcode) {
    const TRANSPARENT_COLOR = new gcodeViewer.Color()
    const DEFAULT_COLOR = new gcodeViewer.Color('#0000ff')
    const PERIM_COLOR = new gcodeViewer.Color('#00ff00')
    const FILL_COLOR = new gcodeViewer.Color('#80ff00')

    let colorConfig = []

    gcode.split("\n").forEach(function(line, i) {
        let color
        if (line.includes("; Draw perimeter")) {
          color = PERIM_COLOR
        } else if (line.includes("; Fill")) {
          color = FILL_COLOR
        } else {
          color = DEFAULT_COLOR
        }
        if (colorConfig.length === 0 || color && colorConfig[colorConfig.length-1].color !== color) {
            colorConfig.push({toLine: i, color})
        } else {
            colorConfig[colorConfig.length - 1].toLine = i
        }
    });

    const renderer = new gcodeViewer.GCodeRenderer(gcode, 480, 360, new gcodeViewer.Color(0x808080))
    //const renderer = new gcodeViewer.GCodeRenderer(gcode, 1024, 768, new gcodeViewer.Color(0x808080))
    renderer.colorizer = new gcodeViewer.LineColorizer(colorConfig)
    renderer.travelWidth = 0 // disable rendering travel moves
    $('#gcode-viewer').empty().append(renderer.element())
    renderer.render()
    renderer.fitCamera()
}

// sanity checks for pattern / bed size
function validate(updateRender = false) {
  setVars();

  var testNaN = {
    // do not use parseInt or parseFloat for validating, since both
    // functions will have special parsing characteristics leading to
    // false numeric validation
    ANCHOR_LAYER_LINE_RATIO: $('#ANCHOR_LAYER_LINE_RATIO').val(),
    ANCHOR_PERIMETERS : $('#ANCHOR_PERIMETERS').val(),
    BED_TEMP: $('#BED_TEMP').val(),
    BED_X: $('#BED_X').val(),
    BED_Y: $('#BED_Y').val(),
    EXT_MULT: $('#EXT_MULT').val(),
    FAN_SPEED: $('#FAN_SPEED').val(),
    FAN_SPEED_FIRSTLAYER: $('#FAN_SPEED_FIRSTLAYER').val(),
    FILAMENT_DIAMETER: $('#FILAMENT_DIAMETER').val(),
    HEIGHT_FIRSTLAYER: $('#HEIGHT_FIRSTLAYER').val(),
    HEIGHT_LAYER: $('#HEIGHT_LAYER').val(),
    NUM_LAYERS: $('#NUM_LAYERS').val(),
    HOTEND_TEMP: $('#HOTEND_TEMP').val(),
    LINE_RATIO: $('#LINE_RATIO').val(),
    NOZZLE_DIAMETER: $('#NOZZLE_DIAMETER').val(),
    CORNER_ANGLE: $('#CORNER_ANGLE').val(),
    WALL_SIDE_LENGTH: $('#WALL_SIDE_LENGTH').val(),
    PATTERN_SPACING: $('#PATTERN_SPACING').val(),
    PA_END: $('#PA_END').val(),
    PA_START: $('#PA_START').val(),
    PA_STEP: $('#PA_STEP').val(),
    WALL_COUNT: $('#WALL_COUNT').val(),
    RETRACT_DIST: $('#RETRACT_DIST').val(),
    SPEED_FIRSTLAYER: $('#SPEED_FIRSTLAYER').val(),
    SPEED_PERIMETER: $('#SPEED_PERIMETER').val(),
    SPEED_RETRACT: $('#SPEED_RETRACT').val(),
    SPEED_TRAVEL: $('#SPEED_TRAVEL').val(),
    SPEED_UNRETRACT: $('#SPEED_UNRETRACT').val(),
    TOOL_INDEX: $('#TOOL_INDEX').val(),
    ZHOP_HEIGHT: $('#ZHOP_HEIGHT').val()
  }

  if ($('#ACCELERATION_ENABLE').prop('checked')){
    testNaN.ACCELERATION = $('#ACCELERATION').val()
  }

  var decimals = getDecimals(parseFloat(testNaN['PA_STEP']));
  var invalid = 0;
  var validationFail = false;
  
  // Reset all warnings before re-check
  $(`\
  #ACCELERATION,#ANCHOR_LAYER_LINE_RATIO,#BED_TEMP,#BED_X,#BED_Y,#TOOL_INDEX,#END_GCODE,#EXT_MULT,#EXTRUDER_NAME,#FAN_SPEED,#FAN_SPEED_FIRSTLAYER,#FILAMENT_DIAMETER,\
  #FILENAME,#HEIGHT_FIRSTLAYER,#NUM_LAYERS,#HOTEND_TEMP,#LAYER_HEIGHT,#LINE_RATIO,#NOZZLE_DIAMETER,#CORNER_ANGLE,#WALL_SIDE_LENGTH,#PATTERN_SPACING,\
  #PA_END,#PA_START,#PA_STEP,#WALL_COUNT,#RETRACT_DIST,#SPEED_FIRSTLAYER,#SPEED_PERIMETER,#SPEED_RETRACT,#SPEED_TRAVEL,#SPEED_UNRETRACT,\
  #START_GCODE,#START_GCODE_TYPE,#ZHOP_HEIGHT`).each((i,t) => {
    t.setCustomValidity('');
    const tid = $(t).attr('id');
    $(`label[for=${tid}]`).removeClass();
  });
  $('#warning1').hide();
  $('#warning2').hide();
  $('#warning3').hide();
  $('#warning4').hide();
  $('#startGcodeWarning').hide();
  $('#downloadButton').prop('disabled', false);
  $('#saveSettingsButton').prop('disabled', false);

  // Check for proper numerical values
  Object.keys(testNaN).forEach((k) => {
    if ((isNaN(testNaN[k]) && !isFinite(testNaN[k])) || testNaN[k].trim().length === 0 || testNaN[k] < 0) {
      $('label[for=' + k + ']').addClass('invalid');
      $('#warning1').text('Some values are not proper numbers. Check highlighted Settings.');
      $('#warning1').addClass('invalid');
      $('#warning1').show();
      validationFail = true;
    }
  });

  // Check text inputs
  if ($('#FILENAME').val() == '' || $('#FILENAME').val() == null) {
    $('label[for=FILENAME]').addClass('invalid');
    $('#warning2').text('File name cannot be blank.');
    $('#warning2').addClass('invalid');
    $('#warning2').show();
    validationFail = true;
  }

  // Make sure spacing is >= 1mm
  if ($('#PATTERN_SPACING').val() < 1 || $('#PATTERN_SPACING').val() == null) {
    $('label[for=PATTERN_SPACING]').addClass('invalid');
    $('#warning3').text('Pattern spacing must be at least 1mm');
    $('#warning3').addClass('invalid');
    $('#warning3').show();
    validationFail = true;
  }

  // Make sure spacing is <= 180 degrees
  if ($('#CORNER_ANGLE').val() > 180 || $('#CORNER_ANGLE').val() == null) {
    $('label[for=CORNER_ANGLE]').addClass('invalid');
    $('#warning3').text('Pattern angle must be <= 180 degrees');
    $('#warning3').addClass('invalid');
    $('#warning3').show();
    validationFail = true;
  }

  // Check text inputs
  /*
  if ($('#EXTRUDER_NAME').val() == '' || $('#EXTRUDER_NAME').val() == null) {
    $('label[for=EXTRUDER_NAME]').addClass('invalid');
    $('#warning3').text('Extruder name cannot be blank.');
    $('#warning3').addClass('invalid');
    $('#warning3').show();
    validationFail = true;
  }
  */
  
  if (!validationFail){ // only check if above checks pass
    // Check if pressure advance stepping is a multiple of the pressure advance Range
    if ((Math.round10(parseFloat(testNaN['PA_END']) - parseFloat(testNaN['PA_START']), PA_round) * Math.pow(10, decimals)) % (parseFloat(testNaN['PA_STEP']) * Math.pow(10, decimals)) !== 0) {
      $('label[for=PA_START]').addClass('invalid');
      $('label[for=PA_END]').addClass('invalid');
      $('label[for=PA_STEP]').addClass('invalid');
      $('#warning1').text('Your PA range cannot be cleanly divided. Check highlighted sttings.');
      $('#warning1').addClass('invalid');
      $('#warning1').show();
      invalid = 1;
      validationFail = true;
    } 
  }

  if (!validationFail){ // only check if above checks pass
    if (parseFloat(testNaN['PA_END']) - parseFloat(testNaN['PA_START']) < 0) { // Check if pressure advance stepping is a multiple of the pressure advance Range
      $('label[for=PA_START]').addClass('invalid');
      $('label[for=PA_END]').addClass('invalid');
      $('#warning1').text('Your PA start value cannot be higher than your PA end value. Check highlighted settings.');
      $('#warning1').addClass('invalid');
      $('#warning1').show();
      invalid = 1;
      validationFail = true;
    } 
  }
  
  if (!validationFail){ // only check if above checks pass
      // Check if pattern settings exceed bed size
      // too tall for round bed
      if (BED_SHAPE === 'Round' && (Math.sqrt(Math.pow(FIT_WIDTH, 2) + Math.pow(FIT_HEIGHT, 2)) > (parseInt(testNaN['BED_X']) - 5)) && FIT_HEIGHT > FIT_WIDTH) {
        $('label[for=PA_START]').addClass('invalid');
        $('label[for=PA_END]').addClass('invalid');
        $('label[for=PA_STEP]').addClass('invalid');
        $('label[for=PATTERN_SPACING]').addClass('invalid');
        $('label[for=CORNER_ANGLE]').addClass('invalid');
        $('label[for=WALL_SIDE_LENGTH]').addClass('invalid');
        $('label[for=WALL_COUNT]').addClass('invalid');
        $('label[for=BED_X]').addClass('invalid');
        $((invalid ? '#warning2' : '#warning1')).text('Your Pattern size (x: ' + Math.round(FIT_WIDTH) + ', y: ' + Math.round(FIT_HEIGHT) + ') exceeds your bed\'s diameter. Check highlighted settings.');
        $((invalid ? '#warning2' : '#warning1')).addClass('invalid');
        $((invalid ? '#warning2' : '#warning1')).show();
        validationFail = true;
      }

      // too wide for round bed
      if (BED_SHAPE === 'Round' && (Math.sqrt(Math.pow(FIT_WIDTH, 2) + Math.pow(FIT_HEIGHT, 2)) > (parseInt(testNaN['BED_X']) - 5)) && FIT_WIDTH > FIT_HEIGHT) {
        $('label[for=PA_START]').addClass('invalid');
        $('label[for=PA_END]').addClass('invalid');
        $('label[for=PA_STEP]').addClass('invalid');
        $('label[for=PATTERN_SPACING]').addClass('invalid');
        $('label[for=CORNER_ANGLE]').addClass('invalid');
        $('label[for=WALL_SIDE_LENGTH]').addClass('invalid');
        $('label[for=WALL_COUNT]').addClass('invalid');
        $('label[for=BED_X]').addClass('invalid');
        $((invalid ? '#warning2' : '#warning1')).text('Your Pattern size (x: ' + Math.round(FIT_WIDTH) + ', y: ' + Math.round(FIT_HEIGHT) + ') exceeds your bed\'s diameter. Check highlighted settings.');
        $((invalid ? '#warning2' : '#warning1')).addClass('invalid');
        $((invalid ? '#warning2' : '#warning1')).show();
        validationFail = true;
      }

      // too wide
      if (BED_SHAPE === 'Rect' && FIT_WIDTH > (parseInt(testNaN['BED_X']) - 5)) {
        $('label[for=PA_START]').addClass('invalid');
        $('label[for=PA_END]').addClass('invalid');
        $('label[for=PA_STEP]').addClass('invalid');
        $('label[for=PATTERN_SPACING]').addClass('invalid');
        $('label[for=CORNER_ANGLE]').addClass('invalid');
        $('label[for=WALL_SIDE_LENGTH]').addClass('invalid');
        $('label[for=WALL_COUNT]').addClass('invalid');
        $('label[for=BED_X]').addClass('invalid');
        $((invalid ? '#warning2' : '#warning1')).text('Your Pattern size (x: ' + Math.round(FIT_WIDTH) + ', y: ' + Math.round(FIT_HEIGHT) + ') exceeds your X bed size. Check highlighted settings.');
        $((invalid ? '#warning2' : '#warning1')).addClass('invalid');
        $((invalid ? '#warning2' : '#warning1')).show();
        validationFail = true;
      }

      // too tall
      if (BED_SHAPE === 'Rect' && FIT_HEIGHT > (parseInt(testNaN['BED_Y']) - 5)) {
        $('label[for=PA_START]').addClass('invalid');
        $('label[for=PA_END]').addClass('invalid');
        $('label[for=PA_STEP]').addClass('invalid');
        $('label[for=PATTERN_SPACING]').addClass('invalid');
        $('label[for=CORNER_ANGLE]').addClass('invalid');
        $('label[for=WALL_SIDE_LENGTH]').addClass('invalid');
        $('label[for=WALL_COUNT]').addClass('invalid');
        $('label[for=BED_Y]').addClass('invalid');
        $((invalid ? '#warning2' : '#warning1')).text('Your Pattern size (x: ' + Math.round(FIT_WIDTH) + ', y: ' + Math.round(FIT_HEIGHT) + ') exceeds your Y bed size. Check highlighted settings.');
        $((invalid ? '#warning2' : '#warning1')).addClass('invalid');
        $((invalid ? '#warning2' : '#warning1')).show();
        validationFail = true;
      }
  }

  // check start g-code for missing essential g-codes
  var message = '<ul>';
  $('#startGcodeWarning').hide();
  $('#startGcodeWarning').removeClass('invalid');
  $('#startGcodeWarning').html('');

  switch (true){
    case $('#START_GCODE_TYPE').val().includes('custom') : // custom and custom-marlin
      if ($('#START_GCODE').val().match(/G28(?! Z)/gm) == null){ message += "<li><tt>G28</tt></li>" } // ensure custom gcodes always include G28 / G28 X* / G28 Y* (not just G28 Z on its own)
      // don't break - continue on to other cases
    case $('#START_GCODE_TYPE').val() !== 'standalone_temp_passing' : // custom, custom-marlin, and standalone
      if (!$('#START_GCODE').val().includes('M190 S[BED_TEMP]')){ message += "<li><tt>M190 S[BED_TEMP]</tt>" } // check for M109 / M190 heating gcodes using variables
      if (!$('#START_GCODE').val().includes('M109 S[HOTEND_TEMP]') && !$('#START_GCODE').val().includes('M568 S[HOTEND_TEMP]')){ message += "<li><tt>M109 S[HOTEND_TEMP]</tt></li>" }
      break;
    case $('#START_GCODE_TYPE').val() === 'standalone_temp_passing' : // standalone_temp_passing
      if (!$('#START_GCODE').val().includes('[BED_TEMP]')){ message += "<li><tt>[BED_TEMP]</tt></li>" } // only check for presence of variables, not heating gcodes
      if (!$('#START_GCODE').val().includes('[HOTEND_TEMP]')){ message += "<li><tt>[HOTEND_TEMP]</tt></li>" }
      break;
  }

  if (message !== '<ul>'){
    message = `\
Please check your start g-code. It does not contain:<br>
${message}<br>`
    if ($('#START_GCODE_TYPE').val() == 'standalone_temp_passing'){
      message += `\
</ul>
<i>It is required to use variables for bed & hotend temps rather than real values.</i><br>
Supported variables (listed above) will change to real values upon g-code generation.<br>
You may use real values for anything apart from bed / hotend temps.`
    }
    else {
      message += `\
</ul>
Copy / paste these lines into your start g-code <i>exactly as listed</i>, using variables instead of real values.<br>
Supported variables (listed above) will change to real values upon g-code generation.<br>
You may use real values for anything apart from bed / hotend temps.`
    }
    $('#startGcodeWarning').html(message);
    $('#startGcodeWarning').addClass('invalid');
    $('#startGcodeWarning').show();
    $('label[for=START_GCODE]').addClass('invalid');
    $('#warning4').text('Problems were found in your start g-code. Check highlighted setting.');
    $('#warning4').addClass('invalid');
    $('#warning4').show();
    validationFail = true;
  }
  
  if (!validationFail){ // actions to take if all checks pass
    displayCalculatedValues();
    if (updateRender){  
      genGcode();
      render(pa_script);
    }
  } else { // actions to take on ANY failure
    $('#downloadButton').prop('disabled', true);
    $('#saveSettingsButton').prop('disabled', true);
    displayCalculatedValues('hide');
  }
}

$(window).load(() => {
  // create tab index dynamically
  $(':input:not(:hidden)').each(function(i) {
    $(this).attr('tabindex', i + 1);
  });

  toggleStartEndGcode();

  // Get localStorage data
  var lsSettings = window.localStorage.getItem('PA_SETTINGS');

  if (lsSettings) {
    var settings = jQuery.parseJSON(lsSettings);
    if (settings['SETTINGS_VERSION'] == SETTINGS_VERSION){ // only populate form with saved settings if version matches current
      $('#ACCELERATION').val(settings['ACCELERATION']);
      $('#ACCELERATION_ENABLE').prop('checked', settings['ACCELERATION_ENABLE']);
      $('#ANCHOR_LAYER_LINE_RATIO').val(settings['ANCHOR_LAYER_LINE_RATIO']);
      $('#ANCHOR_OPTION').val(settings['ANCHOR_OPTION']);
      $('#BED_SHAPE').val(settings['BED_SHAPE']);
      $('#BED_TEMP').val(settings['BED_TEMP']);
      $('#BED_X').val(settings['BED_X']);
      $('#BED_Y').val(settings['BED_Y']);
      $('#ECHO').prop('checked', settings['ECHO']);
      $('#END_GCODE').val(settings['END_GCODE']);
      $('#EXPERT_MODE').prop('checked', settings['EXPERT_MODE']);
      $('#EXTRUDER_NAME').val(settings['EXTRUDER_NAME']);
      $('#EXTRUDER_NAME_ENABLE').prop('checked', settings['EXTRUDER_NAME_ENABLE']);
      $('#EXT_MULT').val(settings['EXT_MULT']);
      $('#FAN_SPEED').val(settings['FAN_SPEED']);
      $('#FAN_SPEED_FIRSTLAYER').val(settings['FAN_SPEED_FIRSTLAYER']);
      $('#FILAMENT_DIAMETER').val(settings['FILAMENT_DIAMETER']);
      $('#FILENAME').val(settings['FILENAME']);
      $('#FIRMWARE').val(settings['FIRMWARE']);
      $('#HEIGHT_FIRSTLAYER').val(settings['HEIGHT_FIRSTLAYER']);
      $('#HEIGHT_LAYER').val(settings['HEIGHT_LAYER']);
      $('#NUM_LAYERS').val(settings['NUM_LAYERS']);
      $('#HOTEND_TEMP').val(settings['HOTEND_TEMP']);
      $('#LINE_RATIO').val(settings['LINE_RATIO']);
      $('#LINENO_NO_LEADING_ZERO').prop('checked', settings['LINENO_NO_LEADING_ZERO']);
      $('#NOZZLE_DIAMETER').val(settings['NOZZLE_DIAMETER']);
      $('#ORIGIN_CENTER').prop('checked', settings['ORIGIN_CENTER']);
      $('#CORNER_ANGLE').val(settings['CORNER_ANGLE']);
      $('#PATTERN_OPTIONS_ENABLE').prop('checked', settings['PATTERN_OPTIONS_ENABLE']);
      $('#WALL_SIDE_LENGTH').val(settings['WALL_SIDE_LENGTH']);
      $('#PATTERN_SPACING').val(settings['PATTERN_SPACING']);
      $('#PA_END').val(settings['PA_END']);
      $('#PA_START').val(settings['PA_START']);
      $('#PA_STEP').val(settings['PA_STEP']);
      $('#WALL_COUNT').val(settings['WALL_COUNT']);
      $('#PRINT_DIR').val(settings['PRINT_DIR']);
      $('#RETRACT_DIST').val(settings['RETRACT_DIST']);
      $('#SPEED_FIRSTLAYER').val(settings['SPEED_FIRSTLAYER']);
      $('#SPEED_PERIMETER').val(settings['SPEED_PERIMETER']);
      $('#SPEED_RETRACT').val(settings['SPEED_RETRACT']);
      $('#SPEED_TRAVEL').val(settings['SPEED_TRAVEL']);
      $('#SPEED_UNRETRACT').val(settings['SPEED_UNRETRACT']);
      $('#START_GCODE').val(settings['START_GCODE']);
      $('#START_GCODE_TYPE').val(settings['START_GCODE_TYPE']);
      $('#TOOL_INDEX').val(settings['TOOL_INDEX']);
      $('#USE_LINENO').prop('checked', settings['USE_LINENO']);
      $('#ZHOP_ENABLE').prop('checked', settings['ZHOP_ENABLE']);
      $('#ZHOP_HEIGHT').val(settings['ZHOP_HEIGHT']);
    }
  }

  // run all toggles after loading user settings
  toggleBedShape();
  toggleFirmwareOptions();
  toggleZHop();
  togglePatternOptions();
  toggleAnchorOptions();
  toggleStartEndGcodeTypeDescriptions();
  toggleLeadingZero();
  toggleAcceleration();
  toggleExtruderName()
  toggleExpertMode();

  // validate input on page load
  // generates gcode and updates 3d preview if validations pass
  validate(true);

  // Focus the first field
  //$('#padv input:first').focus();
});