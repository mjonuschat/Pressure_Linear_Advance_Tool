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

// Settings version of localStorage
// Increase if default settings are changed / amended
const SETTINGS_VERSION = '1.2';

const PA_round = -4; // Was previously -3
const Z_round = -3;
const XY_round = -4;
const EXT_round = -5; // Was previously -4

// Globally keep track of current retract state to prevent retracting/unretracting twice on accident
var RETRACTED = false;

// Globally keep track of current Z coordinate (WITHOUT z hop applied)
var CUR_Z = 0;

function genGcode() {
  // get the values from the HTML elements
  var PRINTER = $('#PRINTER').val(),
      FILAMENT = $('#FILAMENT').val(),
      FILENAME = $('#FILENAME').val(),
      NOTES_ENABLE = $('#NOTES_ENABLE').prop('checked'),
      PATTERN_OPTIONS_ENABLE = $('#PATTERN_OPTIONS_ENABLE').prop('checked'),
      HOTEND_TEMP = parseInt($('#HOTEND_TEMP').val()),
      BED_TEMP = parseInt($('#BED_TEMP').val()),
      FILAMENT_DIAMETER = parseFloat($('#FIL_DIA').val()),
      NOZZLE_DIAMETER = parseFloat($('#NOZ_DIA').val()),
      LINE_RATIO = parseFloat($('#LINE_RATIO').val()),
      //ANCHOR_LAYER = $('#ANCHOR_LAYER').prop('checked'),
      ANCHOR_OPTION = $('#ANCHOR_OPTION').val(),
      ANCHOR_PERIMETERS = parseFloat($('#ANCHOR_PERIMETERS').val()),
      ANCHOR_LAYER_LINE_RATIO = parseFloat($('#ANCHOR_LAYER_LINE_RATIO').val()),
      START_GCODE_TYPE = $('#START_GCODE_TYPE').val(),
      START_GCODE = $('#START_GCODE').val(),
      END_GCODE = $('#END_GCODE').val(),
      SPEED_FIRSTLAYER = parseInt($('#FIRSTLAYER_SPEED').val()),
      //SPEED_FILL = parseInt($('#FILL_SPEED').val()),
      SPEED_PERIMETER = parseInt($('#PERIMETER_SPEED').val()),
      SPEED_MOVE = parseInt($('#MOVE_SPEED').val()),
      SPEED_RETRACT = parseInt($('#RETRACT_SPEED').val()),
      SPEED_UNRETRACT = parseInt($('#UNRETRACT_SPEED').val()),
      ZHOP_ENABLE = $('#ZHOP_ENABLE').prop('checked'),
      ZHOP_HEIGHT = parseFloat($('#ZHOP_HEIGHT').val()),
      ACCELERATION = parseInt($('#PRINT_ACCL').val()),
      RETRACT_DIST = parseFloat($('#RETRACTION').val()),
      BED_SHAPE = $('#SHAPE_BED').val(),
      BED_X = parseInt($('#BEDSIZE_X').val()),
      BED_Y = parseInt($('#BEDSIZE_Y').val()),
      NULL_CENTER = $('#CENTER_NULL').prop('checked'),
      HEIGHT_FIRSTLAYER = parseFloat($('#LAYER_HEIGHT_FIRSTLAYER').val()),
      HEIGHT_LAYER = parseFloat($('#LAYER_HEIGHT').val()),
      HEIGHT_PRINT = parseFloat($('#PRINT_HEIGHT').val()),
      EXTRUDER_NAME = $('#EXTRUDER_NAME').val(),
      FAN_SPEED_FIRSTLAYER = parseFloat($('#FAN_SPEED_FIRSTLAYER').val()),
      FAN_SPEED = parseFloat($('#FAN_SPEED').val()),
      EXT_MULT = parseFloat($('#EXTRUSION_MULT').val()),
      PA_START = parseFloat($('#PA_START').val()),
      PA_END = parseFloat($('#PA_END').val()),
      PA_STEP = parseFloat($('#PA_STEP').val()),
      PRINT_DIR = $('#DIR_PRINT').val(),
      PATTERN_SPACING = parseInt($('#PATTERN_SPACING').val()),
      PATTERN_ANGLE = parseInt($('#PATTERN_ANGLE').val()),
      PERIMETERS = parseInt($('#PERIMETERS').val()),
      //USE_PRIME = $('#PRIME').prop('checked'),
      USE_MMS = $('#MM_S').prop('checked'),
      USE_FWR = $('#USE_FWR').prop('checked'),
      EXT_MULT_PRIME = parseFloat($('#PRIME_EXT').val()),
      //SPEED_PRIME = parseInt($('#PRIME_SPEED').val()),
      //USE_LINENO = $('#LINE_NO').prop('checked'),
      PATTERN_SIDE_LENGTH = parseInt($('#PATTERN_SIDE_LENGTH').val());

  if (BED_SHAPE === 'Round') {
    BED_Y = BED_X;
  }

  if (USE_MMS) {
    SPEED_FIRSTLAYER *= 60;
    //SEED_FILL *= 60;
    SPEED_PERIMETER *= 60;
    SPEED_MOVE *= 60;
    //SPEED_PRIME *= 60;
    SPEED_RETRACT *= 60;
    SPEED_UNRETRACT *= 60;
  }

  // variable calculations in advance for reference later
  var RANGE_PA = PA_END - PA_START,
      NUM_PATTERNS = Math.round(RANGE_PA / PA_STEP + 1),
      NUM_LAYERS = Math.round((HEIGHT_PRINT - HEIGHT_FIRSTLAYER) / HEIGHT_LAYER + 1),
      LINE_WIDTH = NOZZLE_DIAMETER * LINE_RATIO,
      ANCHOR_LAYER_LINE_WIDTH = NOZZLE_DIAMETER * ANCHOR_LAYER_LINE_RATIO,
      EXTRUSION_RATIO = LINE_WIDTH * HEIGHT_LAYER / (Math.pow(FILAMENT_DIAMETER / 2, 2) * Math.PI),
      ANCHOR_LAYER_EXTRUSION_RATIO = ANCHOR_LAYER_LINE_WIDTH * HEIGHT_FIRSTLAYER / (Math.pow(FILAMENT_DIAMETER / 2, 2) * Math.PI),
      LINE_SPACING = LINE_WIDTH - HEIGHT_LAYER * (1 - Math.PI / 4), // from slic3r documentation: spacing = extrusion_width - layer_height * (1 - PI/4)
      ANCHOR_LAYER_LINE_SPACING = ANCHOR_LAYER_LINE_WIDTH - HEIGHT_LAYER * (1 - Math.PI / 4),
      PATTERN_ANGLE_RAD = PATTERN_ANGLE * Math.PI / 180,
      LINE_SPACING_ANGLE = LINE_SPACING / Math.sin(PATTERN_ANGLE_RAD/2),
      RAD45 = 45 * Math.PI / 180,

      PRINT_SIZE_X = (NUM_PATTERNS * ((PERIMETERS - 1) * LINE_SPACING_ANGLE)) + ((NUM_PATTERNS - 1) *  (PATTERN_SPACING + LINE_WIDTH)) + (Math.cos(PATTERN_ANGLE_RAD/2) * PATTERN_SIDE_LENGTH),//Math.sqrt((Math.pow(PATTERN_SIDE_LENGTH, 2) / 2)), // TODO, this last part is not accounting for angles
      PRINT_SIZE_X = Math.round10(PRINT_SIZE_X, XY_round),
      FIT_WIDTH = PRINT_SIZE_X + LINE_WIDTH, // Actual size is + one line width

      PRINT_SIZE_Y = 2 * (Math.sin(PATTERN_ANGLE_RAD/2) * PATTERN_SIDE_LENGTH),
      PRINT_SIZE_Y = Math.round10(PRINT_SIZE_Y, XY_round),
      FIT_HEIGHT = PRINT_SIZE_Y + LINE_WIDTH, // Actual size is + one line width

      CENTER_X = (NULL_CENTER ? 0 : BED_X / 2),
      CENTER_Y = (NULL_CENTER ? 0 : BED_Y / 2),

      PAT_START_X = CENTER_X - (PRINT_SIZE_X / 2),
      PAT_START_Y = CENTER_Y - (PRINT_SIZE_Y / 2),

      // adjust fit width / height for print direction
      printDirRad = PRINT_DIR * Math.PI / 180,
      FIT_WIDTH = Math.abs(PRINT_SIZE_X * Math.cos(printDirRad)) + Math.abs(PRINT_SIZE_Y * Math.sin(printDirRad)),
      FIT_HEIGHT = Math.abs(PRINT_SIZE_X * Math.sin(printDirRad)) + Math.abs(PRINT_SIZE_Y * Math.cos(printDirRad)),

      txtArea = document.getElementById('gcodetextarea');

  var basicSettings = {
    'firstLayerSpeed': SPEED_FIRSTLAYER,
    'moveSpeed': SPEED_MOVE,
    'centerX': CENTER_X,
    'centerY': CENTER_Y,
    'printDir': PRINT_DIR,
    'lineWidth': LINE_WIDTH,
    'lineSpacing': LINE_SPACING,
    'extRatio': EXTRUSION_RATIO,
    'extMult': EXT_MULT,
    'extMultPrime': EXT_MULT_PRIME,
    'anchorExtRatio': ANCHOR_LAYER_EXTRUSION_RATIO,
    'anchorLineWidth': ANCHOR_LAYER_LINE_WIDTH,
    'anchorLineSpacing': ANCHOR_LAYER_LINE_SPACING,
    'retractDist': RETRACT_DIST,
    'retractSpeed': SPEED_RETRACT,
    'unretractSpeed': SPEED_UNRETRACT,
    'fwRetract': USE_FWR,
    'extruderName': EXTRUDER_NAME,
    'zhopEnable': ZHOP_ENABLE,
    'zhopHeight': ZHOP_HEIGHT
  };

  // Start G-code for pattern
  var pa_script =  '; ### Klipper Pressure Advance Calibration Pattern ###\n' + // TODO: Clean / reorder
                  '; -------------------------------------------\n' +
                  ';\n' +
                  '; Created: ' + new Date() + '\n' +
                  ( PRINTER && NOTES_ENABLE ? '; Printer Name: ' + PRINTER + '\n' : '') + 
                  ( FILAMENT && NOTES_ENABLE ? '; Filament Name: ' + FILAMENT + '\n' : '') + 
                  ';\n' +
                  '; Printer:\n' +
                  '; Nozzle Diameter = ' + NOZZLE_DIAMETER + ' mm\n' +
                  '; Filament Diameter = ' + FILAMENT_DIAMETER + ' mm\n' +
                  '; Extrusion Multiplier = ' + EXT_MULT + '\n' +
                  '; Extruder Name = ' + EXTRUDER_NAME + ' \n' +
                  '; Start G-code Type = ' + START_GCODE_TYPE + ' \n' +
                  '; Start G-code = ' + START_GCODE.replace(/^/gm, '; ')+ '\n' +
                  '; End G-code = ' + END_GCODE.replace(/^/gm, '; ')+ '\n' +
                  ';\n' +
                  '; Bed:\n' +
                  '; Bed Shape = ' + BED_SHAPE + '\n' +
                  (BED_SHAPE === 'Round' ? '; Bed Diameter = ' + BED_X + ' mm\n' : '; Bed Size X = ' + BED_X + ' mm\n') +
                  (BED_SHAPE === 'Round' ? '' : '; Bed Size Y = ' + BED_Y + ' mm\n') +
                  '; Origin Bed Center = ' + (NULL_CENTER ? 'true' : 'false') + '\n' +
                  ';\n' +
                  '; Retraction:\n' +
                  '; Use FWRETRACT = ' + (USE_FWR ? 'true' : 'false') + '\n' +
                  '; Retraction Distance = ' + RETRACT_DIST + ' mm\n' +
                  '; Retract Speed = ' + (USE_MMS ? SPEED_RETRACT / 60 + "mm/s" : SPEED_RETRACT + ' mm/min') + '\n' +
                  '; Unretract Speed = ' + (USE_MMS ? SPEED_UNRETRACT / 60 + "mm/s" : SPEED_UNRETRACT + ' mm/min') + '\n' +
                  '; Z Hop Enable = ' + ZHOP_ENABLE + '\n' +
                  ( ZHOP_ENABLE ? '; Z Hop Height: ' + ZHOP_HEIGHT + 'mm\n' : '') + 
                  ';\n' +
                  '; First Layer:\n' +
                  '; First Layer Height = ' + HEIGHT_FIRSTLAYER + ' mm\n' +
                  '; First Layer Printing Speed = ' + (USE_MMS ? SPEED_FIRSTLAYER / 60 + "mm/s" : SPEED_FIRSTLAYER + ' mm/min') + '\n' +
                  '; First Layer Fan Speed = ' + FAN_SPEED_FIRSTLAYER + ' %\n' +
                  ';\n' +
                  '; Print Settings:\n' +
                  '; Layer Height = ' + HEIGHT_LAYER + ' mm\n' +
                  '; Total Print Height = ' + HEIGHT_PRINT + ' mm\n' +
                  '; Fan Speed = ' + FAN_SPEED + ' %\n' +
                  //';\n' +
                  //'; Settings Print Bed:\n' +

                  ';\n' +
                  '; Speeds:\n' +
                  '; Use mm/s = ' + USE_MMS + '\n' +
                  
                  '; Perimeter Printing Speed = ' + (USE_MMS ? SPEED_PERIMETER / 60 + "mm/s" : SPEED_PERIMETER + ' mm/min') + '\n' +
                  '; Movement Speed = ' + (USE_MMS ? SPEED_MOVE / 60 + "mm/s" : SPEED_MOVE + ' mm/min') + '\n' +
                  
                  
                  '; Printing Acceleration = ' + ACCELERATION + ' mm/s^2\n' +
                  ';\n' +
                  '; Pattern Settings:\n' +
                  '; Starting Value Factor = ' + PA_START + '\n' +
                  '; Ending Value Factor = ' + PA_END + '\n' +
                  '; Factor Stepping = ' + PA_STEP + '\n' +
                  '; Pattern Spacing = ' + PATTERN_SPACING + ' mm\n' +
                  '; Pattern Angle = ' + PATTERN_ANGLE + 'degrees \n' +
                  '; Perimeters = ' + PERIMETERS + ' mm\n' +
                  '; Side Length = ' + PATTERN_SIDE_LENGTH + ' mm\n' +
                  //'; Number Lines = ' + (USE_LINENO ? 'true' : 'false') + '\n' +
                  '; Number of Patterns to Print = ' + NUM_PATTERNS + '\n' +
                  ';\n' +
                  '; Dimensions:\n' +

                  '; Print Size X = ' + FIT_WIDTH + ' mm\n' +
                  '; Print Size Y = ' + FIT_HEIGHT + ' mm\n' +
                  '; Print Rotation = ' + PRINT_DIR + ' degree\n' +
                  //';\n' +
                  //'; Settings Advance:\n' +
                  '; Line Width Ratio = ' + LINE_RATIO + '\n' +
                  '; Anchor Perimeters = ' + ANCHOR_PERIMETERS + '\n' +
                  //'; Print Anchor Layer = ' + ANCHOR_LAYER + '\n' +
                  '; Anchor Layer Line Width Ratio = ' + ANCHOR_LAYER_LINE_RATIO + '\n' +
                  //'; Prime Nozzle = ' + (USE_PRIME ? 'true' : 'false') + '\n' +
                  //'; Prime Extrusion Multiplier = ' + EXT_MULT_PRIME + '\n' +
                  //'; Prime Speed = ' + SPEED_PRIME + '\n' +
                  ';\n' +
                  '; prepare printing\n' +
                  ';\n' +
                  'ACTIVATE_EXTRUDER EXTRUDER=' + EXTRUDER_NAME + '\n' +
                  (START_GCODE_TYPE != 'standalone_temp_passing' ? 'M190 S' + BED_TEMP + ' ; set & wait for bed temp\n' : '') +
                  (START_GCODE_TYPE != 'standalone_temp_passing' ? 'M109 S' + HOTEND_TEMP + ' ; set & wait for hotend temp\n' : '') +
                   START_GCODE + '\n' +
                  'G21 ; Millimeter units\n' +
                  'G90 ; Absolute XYZ\n' +
                  'M83 ; Relative E\n' +
                  'SET_VELOCITY_LIMIT ACCEL=' + ACCELERATION + '\n' +
                  'G92 E0 ; Reset extruder distance\n' +
                  'M106 S' + Math.round(FAN_SPEED_FIRSTLAYER * 2.55) + '\n';

  var TO_X = 0,
      TO_Y = 0,
      TO_Z = 0;

  //Move to layer height then start position
  TO_Z = HEIGHT_FIRSTLAYER;
  CUR_Z = TO_Z;
  pa_script += doEfeed('-', basicSettings, (USE_FWR ? 'FWR' : 'STD')) + //retract
               moveTo(PAT_START_X, PAT_START_Y, basicSettings) + 
               doEfeed('+', basicSettings, (USE_FWR ? 'FWR' : 'STD')) +  //unretract
               'G1 Z' + TO_Z + ' F' + SPEED_MOVE + ' ; Move to layer height\n';

  // create multiple anchor layers (currently just set to 1)
  if (ANCHOR_OPTION != 'no_anchor'){
    var NUM_SOLID_LAYERS = 1; // might add as a setting later
    pa_script += 'SET_PRESSURE_ADVANCE ADVANCE=' + PA_START + ' EXTRUDER=' + EXTRUDER_NAME + ' ; Set Pressure Advance\n'

    // loop for total number of solid layers (don't exceed max print height)
    for (let i = 0; i < Math.min(NUM_SOLID_LAYERS, NUM_LAYERS) ; i++){

      if (i != 0){ // for more layers, move back to start + layer height
        TO_Z = i * HEIGHT_LAYER + HEIGHT_FIRSTLAYER;
        CUR_Z = TO_Z;

        pa_script += doEfeed('-', basicSettings, (USE_FWR ? 'FWR' : 'STD')) + //retract
                     moveTo(PAT_START_X, PAT_START_Y, basicSettings) + 
                     doEfeed('+', basicSettings, (USE_FWR ? 'FWR' : 'STD')) +  //unretract
                    'G1 Z' + TO_Z + ' F' + SPEED_MOVE + ' ; Move to layer height\n';
      }
      
      if (ANCHOR_OPTION == 'anchor_frame'){
        pa_script += createAnchorPerimeters(PAT_START_X, PAT_START_Y, (PRINT_SIZE_X + ANCHOR_LAYER_LINE_SPACING * (ANCHOR_PERIMETERS - 1)), PRINT_SIZE_Y, ANCHOR_PERIMETERS, basicSettings);
        var NUM_SOLID_LAYERS = 0; // So that it still prints the pattern on the first layer (inside the frame)
      }
      else if (ANCHOR_OPTION == 'anchor_layer'){
        // create enough perims to reach center (concentric fill)
        var NUM_CONCENTRIC = Math.floor((PRINT_SIZE_Y * Math.sin(RAD45)) / (ANCHOR_LAYER_LINE_SPACING / Math.sin(RAD45)));
        pa_script += createAnchorPerimeters(PAT_START_X, PAT_START_Y, PRINT_SIZE_X, PRINT_SIZE_Y, NUM_CONCENTRIC, basicSettings);
      }
    }
  } else {
    var NUM_SOLID_LAYERS = 0;
  }

  // draw PA pattern
  for (let i = NUM_SOLID_LAYERS; i < NUM_LAYERS ; i++){

    TO_X = PAT_START_X;
    TO_Y = PAT_START_Y;

    if (i == 0 && ANCHOR_OPTION == 'anchor_frame'){ // shrink on first layer to fit inside frame
      var SHRINK = (ANCHOR_LAYER_LINE_SPACING * (ANCHOR_PERIMETERS - 1)) / Math.sin(PATTERN_ANGLE_RAD / 2); // 1.5708 = 90 degrees in radians
      var LENGTH = PATTERN_SIDE_LENGTH - SHRINK; 
      TO_X += SHRINK * Math.sin(1.5708 - PATTERN_ANGLE_RAD / 2);
      TO_Y += ANCHOR_LAYER_LINE_SPACING * (ANCHOR_PERIMETERS - 1);
    } else {
      var LENGTH = PATTERN_SIDE_LENGTH;
    }

    // move to start xy
    pa_script += doEfeed('-', basicSettings, (USE_FWR ? 'FWR' : 'STD')) + //retract
                 moveTo(TO_X, TO_Y, basicSettings) + 
                 doEfeed('+', basicSettings, (USE_FWR ? 'FWR' : 'STD'));  //unretract

    // move to layer height
    TO_Z = (i * HEIGHT_LAYER) + HEIGHT_FIRSTLAYER;
    CUR_Z = TO_Z;
    pa_script += 'G1 Z' + TO_Z + ' F' + SPEED_MOVE + ' ; Move to layer height\n';

    for (let j = 0; j < NUM_PATTERNS; j++){
      var INITIAL_X = TO_X;
      var INITIAL_Y = TO_Y;
      // increment pressure advance
      pa_script += 'SET_PRESSURE_ADVANCE ADVANCE=' + (PA_START + (j * PA_STEP)) + ' EXTRUDER=' + EXTRUDER_NAME + ' ; Set Pressure Advance\n' + 
                    'M106 S' + (i == 0 ? Math.round(FAN_SPEED_FIRSTLAYER * 2.55) : Math.round(FAN_SPEED * 2.55)) + '\n'; // if first layer - set fan speed to first layer - otherwise, set to printing fan speed

      for (let k = 0; k < PERIMETERS ; k++){
        TO_X += (Math.cos(PATTERN_ANGLE_RAD / 2) * LENGTH);
        TO_Y += (Math.sin(PATTERN_ANGLE_RAD / 2) * LENGTH);

        pa_script += doEfeed('+', basicSettings, (USE_FWR ? 'FWR' : 'STD')) +  //unretract
                    createLine(TO_X, TO_Y, LENGTH, basicSettings, {'extRatio': EXTRUSION_RATIO, 'speed': (i == 0 ? SPEED_FIRSTLAYER : SPEED_PERIMETER)});

        TO_X -= Math.cos(PATTERN_ANGLE_RAD / 2) * LENGTH;
        TO_Y += Math.sin(PATTERN_ANGLE_RAD / 2) * LENGTH;

        pa_script += createLine(TO_X, TO_Y, LENGTH, basicSettings, {'extRatio': EXTRUSION_RATIO, 'speed': (i == 0 ? SPEED_FIRSTLAYER : SPEED_PERIMETER)}) +
                      doEfeed('-', basicSettings, (USE_FWR ? 'FWR' : 'STD')); //retract

        TO_Y = INITIAL_Y;
        if (k != PERIMETERS - 1){ // if not last perimeter yet, move forward line spacing instead of pattern spacing
          TO_X += LINE_SPACING_ANGLE;
        } else {
          if (j == NUM_PATTERNS - 1){ // if last pattern and last perimeter, travel back to start X instead of + spacing
            TO_X = INITIAL_X;
          }else{
            TO_X += (PATTERN_SPACING + LINE_WIDTH);
          }
        }
        pa_script += moveTo(TO_X, TO_Y, basicSettings);
      }
    }
  }

/*
  // Prime nozzle if activated
  if (USE_PRIME) {
    var primeStartX = CENTER_X - LENGTH_SLOW - (0.5 * PATTERN_SIDE_LENGTH) - (USE_LINENO ? 4 : 0) - 5,
        primeStartY = CENTER_Y - (PRINT_SIZE_Y / 2);

    pa_script += ';\n' +
                '; prime nozzle\n' +
                ';\n' +
                moveTo(primeStartX, primeStartY, basicSettings) +
                createLine(primeStartX, primeStartY + PRINT_SIZE_Y, PRINT_SIZE_Y, basicSettings, {'extMult': EXT_MULT_PRIME, 'speed': SPEED_PRIME}) +
                moveTo(primeStartX + (LINE_WIDTH * 1.5), primeStartY + PRINT_SIZE_Y, basicSettings) +
                createLine(primeStartX + (LINE_WIDTH * 1.5), primeStartY, -PRINT_SIZE_Y, basicSettings, {'extMult': EXT_MULT_PRIME, 'speed': SPEED_PRIME}) +
                doEfeed('-', basicSettings, (USE_FWR ? 'FWR' : 'STD'));
  }

  // print K values beside the test lines
  if (USE_LINENO) {
    var numStartX = CENTER_X + (0.5 * PATTERN_SIDE_LENGTH) + LENGTH_SLOW + (USE_PRIME ? 5 : 0) - 2,
        numStartY = PAT_START_Y - 2,
        stepping = 0;

    pa_script += ';\n' +
                '; print K-values\n' +
                ';\n';

    for (var i = PA_START; i <= PA_END; i += PA_STEP) {
      if (stepping % 2 === 0) {
        pa_script += moveTo(numStartX, numStartY + (stepping * PATTERN_SPACING), basicSettings) +
                    zHop((HEIGHT_LAYER + Z_OFFSET), basicSettings) +
                    doEfeed('+', basicSettings, (USE_FWR ? 'FWR' : 'STD')) +
                    createGlyphs(numStartX, numStartY + (stepping * PATTERN_SPACING), basicSettings, Math.round10(i, PA_round)) +
                    doEfeed('-', basicSettings, (USE_FWR ? 'FWR' : 'STD')) +
                    zHop((HEIGHT_LAYER + Z_OFFSET) + 0.1, basicSettings);
      }
      stepping += 1;
    }
  }
  */

  pa_script += ';\n' +
              '; FINISH\n' +
              ';\n' +
              END_GCODE + '\n' +
              ';';

  txtArea.value = pa_script;
}


// Save content of textarea to file using
// https://github.com/eligrey/FileSaver.js
function saveTextAsFile() {
  var textToWrite = document.getElementById('gcodetextarea').value,
      textFileAsBlob = new Blob([textToWrite], {type: 'text/plain'}),
      usersFilename = document.getElementById('FILENAME').value,
      filename = usersFilename || '',
      fileNameToSaveAs = filename + '.gcode';
  if (textToWrite) {
    saveAs(textFileAsBlob, fileNameToSaveAs);
  } else {
    alert('Generate G-code first');
    return;
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

// print a line between current position and target
function createLine(coordX, coordY, length, basicSettings, optional) {
  var ext = 0,
      gcode = '';

  //handle optional function arguements passed as object
  var defaults = {
    speed: basicSettings['firstLayerSpeed'],
    extMult: basicSettings['extMult'],
    extRatio: basicSettings['extRatio'],
    comment: ' ; print line\n'
  };
  var optArgs = $.extend({}, defaults, optional);

  ext = Math.round10(optArgs['extRatio'] * optArgs['extMult'] * Math.abs(length), EXT_round);

  gcode += 'G1 X' + Math.round10(rotateX(coordX, basicSettings['centerX'], coordY, basicSettings['centerY'], basicSettings['printDir']), XY_round) +
             ' Y' + Math.round10(rotateY(coordX, basicSettings['centerX'], coordY, basicSettings['centerY'], basicSettings['printDir']), XY_round) +
             ' E' + ext + ' F' + optArgs['speed'] + optArgs['comment'];

  return gcode;
}

// move print head to coordinates
function moveTo(coordX, coordY, basicSettings) {
  var gcode = '';

  gcode += 'G0 X' + Math.round10(rotateX(coordX, basicSettings['centerX'], coordY, basicSettings['centerY'], basicSettings['printDir']), XY_round) +
             ' Y' + Math.round10(rotateY(coordX, basicSettings['centerX'], coordY, basicSettings['centerY'], basicSettings['printDir']), XY_round) +
             ' F' + basicSettings['moveSpeed'] + ' ; move\n';
  return gcode;
}

// create retract / un-retract gcode
function doEfeed(dir, basicSettings, type) {
  var gcode = '';

  if (basicSettings['zhopEnable'] == false){
    switch (true) {
      case (type === 'STD' && dir === '+' && RETRACTED === true):
        gcode += 'G1 E' + Math.round10(basicSettings['retractDist'], EXT_round) + ' F' + basicSettings['unretractSpeed'] + ' ; un-retract\n';
        RETRACTED = false;
        break;
      case (type === 'STD' && dir === '-' && RETRACTED === false):
        gcode += 'G1 E-' + Math.round10(basicSettings['retractDist'], EXT_round) + ' F' + basicSettings['retractSpeed'] + ' ; retract\n';
        RETRACTED = true;
        break;
      case (type === 'FWR' && dir === '+' && RETRACTED === true):
        gcode += 'G11 ; un-retract\n';
        RETRACTED = false;
        break;
      case (type === 'FWR' && dir === '-' && RETRACTED === false):
        gcode += 'G10 ; retract\n';
        RETRACTED = true;
        break;
    }
  } else {
    switch (true) {
      case (type === 'STD' && dir === '+' && RETRACTED === true):
        gcode += 'G1 Z' + Math.round10(CUR_Z, Z_round) + ' F' + basicSettings['moveSpeed'] + ' ; z hop return\n' +
                 'G1 E' + Math.round10(basicSettings['retractDist'], EXT_round) + ' F' + basicSettings['unretractSpeed'] + ' ; un-retract\n';
        RETRACTED = false;
        break;
      case (type === 'STD' && dir === '-' && RETRACTED === false):
        gcode += 'G1 E-' + Math.round10(basicSettings['retractDist'], EXT_round) + ' F' + basicSettings['retractSpeed'] + ' ; retract\n' +
                 'G1 Z' + Math.round10((CUR_Z + basicSettings['zhopHeight']), Z_round) + ' F' + basicSettings['moveSpeed'] + ' ; z hop\n';
                 
        RETRACTED = true;
        break;
      case (type === 'FWR' && dir === '+' && RETRACTED === true):
        gcode += 'G1 Z' + Math.round10(CUR_Z, Z_round) + ' F' + basicSettings['moveSpeed'] + ' ; z hop return\n' +
                 'G11 ; un-retract\n';
        RETRACTED = false;
        break;
      case (type === 'FWR' && dir === '-' && RETRACTED === false):
        gcode += 'G10 ; retract\n' +
                 'G1 Z' + Math.round10((CUR_Z + basicSettings['zhopHeight']), Z_round) + ' F' + basicSettings['moveSpeed'] + ' ; z hop\n';
        RETRACTED = true;
        break;
    }
  }
  return gcode;
}

// draw perimeter, move inwards, repeat
function createAnchorPerimeters(start_x, start_y, end_x, end_y, num_perims, basicSettings, optional){
  var gcode = '',
      to_x = start_x,
      to_y = start_y,
      prev_x = 0,
      prev_y = 0;

  //handle optional function arguements passed as object
  var defaults = {
    spacing: basicSettings['anchorLineSpacing'],
    speed: basicSettings['firstLayerSpeed'],
    extRatio: basicSettings['anchorExtRatio'],
    comment: ' ; print line\n'
  };

  var optArgs = $.extend({}, defaults, optional);
  
  for (let i = 0; i < num_perims ; i++){

    if (i != 0){ // after first perimeter, step inwards to start next perimeter
      to_x += optArgs['spacing'];
      to_y += optArgs['spacing'];
      gcode += moveTo(to_x, to_y, basicSettings)
    }
    // draw line up
    prev_y = to_y;
    to_y += end_y - (i * optArgs['spacing']) * 2;
    gcode += createLine(to_x, to_y, (to_y - prev_y), basicSettings, {'extRatio': optArgs['extRatio'], 'speed': optArgs['speed']});

    // draw line right
    prev_x = to_x;
    to_x += end_x - (i * optArgs['spacing']) * 2;
    gcode += createLine(to_x, to_y, (to_x - prev_x), basicSettings, {'extRatio': optArgs['extRatio'], 'speed': optArgs['speed']});

    // draw line down
    prev_y = to_y;
    to_y -= end_y - (i * optArgs['spacing']) * 2;
    gcode += createLine(to_x, to_y, (to_y - prev_y), basicSettings, {'extRatio': optArgs['extRatio'], 'speed': optArgs['speed']});

    // draw line left
    prev_x = to_x;
    to_x -= end_x - (i * optArgs['spacing']) * 2;
    gcode += createLine(to_x, to_y, (to_x - prev_x), basicSettings, {'extRatio': optArgs['extRatio'], 'speed': optArgs['speed']});
  }
  return gcode;
}

/*
// create digits for K line numbering
function createGlyphs(startX, startY, basicSettings, value) {
  var glyphSegHeight = 2,
      glyphSegHeight2 = 0.4,
      glyphSpacing = 3.0,
      glyphString = '',
      xCount = 0,
      yCount = 0,
      sNumber = value.toString(),
      glyphSeg = {
        '1': ['up', 'up'],
        '2': ['mup', 'mup', 'right', 'down', 'left', 'down', 'right'],
        '3': ['mup', 'mup', 'right', 'down', 'down', 'left', 'mup', 'right'],
        '4': ['mup', 'mup', 'down', 'right', 'mup', 'down', 'down'],
        '5': ['right', 'up', 'left', 'up', 'right'],
        '6': ['mup', 'right', 'down', 'left', 'up', 'up', 'right'],
        '7': ['mup', 'mup', 'right', 'down', 'down'],
        '8': ['mup', 'right', 'down', 'left', 'up', 'up', 'right', 'down'],
        '9': ['right', 'up', 'left', 'up', 'right', 'down'],
        '0': ['right', 'up', 'up', 'left', 'down', 'down'],
        '.': ['dot']
      };

  for (var i = 0, len = sNumber.length; i < len; i += 1) {
    for (var key in glyphSeg[sNumber.charAt(i)]) {
      if(glyphSeg[sNumber.charAt(i)].hasOwnProperty(key)) {
        var up = createLine(startX + (xCount * glyphSegHeight), startY + (yCount * glyphSegHeight) + glyphSegHeight, glyphSegHeight, basicSettings, {'speed': basicSettings['firstLayerSpeed'], 'comment': ' ; ' + sNumber.charAt(i) + '\n'}),
            down = createLine(startX + (xCount * glyphSegHeight), startY + (yCount * glyphSegHeight) - glyphSegHeight, glyphSegHeight, basicSettings, {'speed': basicSettings['firstLayerSpeed'], 'comment': ' ; ' + sNumber.charAt(i) + '\n'}),
            right = createLine(startX + (xCount * glyphSegHeight) + glyphSegHeight, startY + (yCount * glyphSegHeight), glyphSegHeight, basicSettings, {'speed': basicSettings['firstLayerSpeed'], 'comment': ' ; ' + sNumber.charAt(i) + '\n'}),
            left = createLine(startX + (xCount * glyphSegHeight) - glyphSegHeight, startY + (yCount * glyphSegHeight), glyphSegHeight, basicSettings, {'speed': basicSettings['firstLayerSpeed'], 'comment': ' ; ' + sNumber.charAt(i) + '\n'}),
            mup = moveTo(startX + (xCount * glyphSegHeight), startY + (yCount * glyphSegHeight) + glyphSegHeight, basicSettings),
            dot = createLine(startX, startY + glyphSegHeight2, glyphSegHeight2, basicSettings, {speed: basicSettings['firstLayerSpeed'], comment: ' ; dot\n'});
        if (glyphSeg[sNumber.charAt(i)][key] === 'up') {
          glyphString += up;
          yCount += 1;
        } else if (glyphSeg[sNumber.charAt(i)][key] === 'down') {
          glyphString += down;
          yCount -= 1;
        } else if (glyphSeg[sNumber.charAt(i)][key] === 'right') {
          glyphString += right;
          xCount += 1;
        } else if (glyphSeg[sNumber.charAt(i)][key] === 'left') {
          glyphString += left;
          xCount -= 1;
        } else if (glyphSeg[sNumber.charAt(i)][key] === 'mup') {
          glyphString += mup;
          yCount += 1;
        } else if (glyphSeg[sNumber.charAt(i)][key] === 'dot') {
          glyphString += dot;
        }
      }
    }
    if (sNumber.charAt(i) === '1' || sNumber.charAt(i) === '.') {
      startX += 1;
    } else {
      startX += glyphSpacing;
    }
    if (i !== sNumber.length - 1) {
      glyphString += doEfeed('-', basicSettings, (basicSettings['fwRetract'] ? 'FWR' : 'STD')) +
                     moveTo(startX, startY, basicSettings) +
                     doEfeed('+', basicSettings, (basicSettings['fwRetract'] ? 'FWR' : 'STD'));
    }
    yCount = 0;
    xCount = 0;
  }
  return glyphString;
}
*/

// rotate x around a defined center xm, ym
function rotateX(x, xm, y, ym, a) {
  a = a * Math.PI / 180; // Convert to radians
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
  a = a * Math.PI / 180; // Convert to radians
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
var   NOTES_ENABLE = $('#NOTES_ENABLE').prop('checked'),
      PATTERN_OPTIONS_ENABLE = $('#PATTERN_OPTIONS_ENABLE').prop('checked'),
      HOTEND_TEMP = parseInt($('#HOTEND_TEMP').val()),
      BED_TEMP = parseInt($('#BED_TEMP').val()),
      START_GCODE_TYPE = $('#START_GCODE_TYPE').val(),
      ANCHOR_OPTION = $('#ANCHOR_OPTION').val(),
      FILAMENT_DIAMETER = parseFloat($('#FIL_DIA').val()),
      NOZZLE_DIAMETER = parseFloat($('#NOZ_DIA').val()),
      LINE_RATIO = parseFloat($('#LINE_RATIO').val()),
      ANCHOR_LAYER_LINE_RATIO = parseFloat($('#ANCHOR_LAYER_LINE_RATIO').val()),
      START_GCODE = $('#START_GCODE').val(),
      END_GCODE = $('#END_GCODE').val(),
      SPEED_FIRSTLAYER = parseInt($('#FIRSTLAYER_SPEED').val()),
      //SPEED_FILL = parseInt($('#FILL_SPEED').val()),
      SPEED_PERIMETER = parseInt($('#PERIMETER_SPEED').val()),
      SPEED_MOVE = parseInt($('#MOVE_SPEED').val()),
      SPEED_RETRACT = parseInt($('#RETRACT_SPEED').val()),
      SPEED_UNRETRACT = parseInt($('#UNRETRACT_SPEED').val()),
      ACCELERATION = parseInt($('#PRINT_ACCL').val()),
      RETRACT_DIST = parseFloat($('#RETRACTION').val()),
      ZHOP_ENABLE = $('#ZHOP_ENABLE').prop('checked'),
      ZHOP_HEIGHT = parseFloat($('#ZHOP_HEIGHT').val()),
      BED_SHAPE = $('#SHAPE_BED').val(),
      BED_X = parseInt($('#BEDSIZE_X').val()),
      BED_Y = parseInt($('#BEDSIZE_Y').val()),
      NULL_CENTER = $('#CENTER_NULL').prop('checked'),
      HEIGHT_FIRSTLAYER = parseFloat($('#LAYER_HEIGHT_FIRSTLAYER').val()),
      HEIGHT_LAYER = parseFloat($('#LAYER_HEIGHT').val()),
      ANCHOR_LAYER = $('#ANCHOR_LAYER').prop('checked'),
      HEIGHT_PRINT = parseFloat($('#PRINT_HEIGHT').val()),
      EXTRUDER_NAME = $('#EXTRUDER_NAME').val(),
      FAN_SPEED_FIRSTLAYER = parseFloat($('#FAN_SPEED_FIRSTLAYER').val()),
      FAN_SPEED = parseFloat($('#FAN_SPEED').val()),
      EXT_MULT = parseFloat($('#EXTRUSION_MULT').val()),
      PA_START = parseFloat($('#PA_START').val()),
      PA_END = parseFloat($('#PA_END').val()),
      PA_STEP = parseFloat($('#PA_STEP').val()),
      PRINT_DIR = $('#DIR_PRINT').val(),
      PATTERN_SPACING = parseFloat($('#PATTERN_SPACING').val()),
      PATTERN_ANGLE = parseFloat($('#PATTERN_ANGLE').val()),
      PERIMETERS = parseFloat($('#PERIMETERS').val()),
      //USE_PRIME = $('#PRIME').prop('checked'),
      //EXT_MULT_PRIME = parseFloat($('#PRIME_EXT').val()),
      //SPEED_PRIME = parseFloat($('#PRIME_SPEED').val()),
      PATTERN_SIDE_LENGTH = parseFloat($('#PATTERN_SIDE_LENGTH').val()),
      USE_FWR = $('#USE_FWR').prop('checked'),
      USE_MMS = $('#MM_S').prop('checked');
      //USE_LINENO = $('#LINE_NO').prop('checked');

  var settings = {
    'NOTES_ENABLE': NOTES_ENABLE,
    'PATTERN_OPTIONS_ENABLE': PATTERN_OPTIONS_ENABLE,
    'HOTEND_TEMP': HOTEND_TEMP,
    'BED_TEMP': BED_TEMP,
    'FILAMENT_DIAMETER': FILAMENT_DIAMETER,
    'NOZZLE_DIAMETER': NOZZLE_DIAMETER,
    'LINE_RATIO': LINE_RATIO,
    'ANCHOR_OPTION': ANCHOR_OPTION,
    'ANCHOR_LAYER_LINE_RATIO': ANCHOR_LAYER_LINE_RATIO,
    'START_GCODE_TYPE': START_GCODE_TYPE,
    'START_GCODE': START_GCODE,
    'END_GCODE': END_GCODE,
    'SPEED_FIRSTLAYER': SPEED_FIRSTLAYER,
    'SPEED_PERIMETER': SPEED_PERIMETER,
    'SPEED_MOVE': SPEED_MOVE,
    'SPEED_RETRACT': SPEED_RETRACT,
    'SPEED_UNRETRACT': SPEED_UNRETRACT,
    'ACCELERATION': ACCELERATION,
    'RETRACT_DIST': RETRACT_DIST,
    'ZHOP_ENABLE': ZHOP_ENABLE,
    'ZHOP_HEIGHT': ZHOP_HEIGHT,
    'BED_SHAPE': BED_SHAPE,
    'BED_X': BED_X,
    'BED_Y': BED_Y,
    'NULL_CENTER': NULL_CENTER,
    'HEIGHT_FIRSTLAYER': HEIGHT_FIRSTLAYER,
    'ANCHOR_LAYER': ANCHOR_LAYER,
    'HEIGHT_LAYER': HEIGHT_LAYER,
    'HEIGHT_PRINT': HEIGHT_PRINT,
    'EXTRUDER_NAME': EXTRUDER_NAME,
    'FAN_SPEED_FIRSTLAYER' : FAN_SPEED_FIRSTLAYER,
    'FAN_SPEED' : FAN_SPEED,
    'EXT_MULT': EXT_MULT,
    'PA_START': PA_START,
    'PA_END': PA_END,
    'PA_STEP': PA_STEP,
    'PRINT_DIR': PRINT_DIR,
    'PATTERN_SPACING': PATTERN_SPACING,
    'PATTERN_ANGLE': PATTERN_ANGLE,
    'PERIMETERS': PERIMETERS,
    //'USE_PRIME': USE_PRIME,
    //'EXT_MULT_PRIME': EXT_MULT_PRIME,
    //'SPEED_PRIME' : SPEED_PRIME,
    'PATTERN_SIDE_LENGTH': PATTERN_SIDE_LENGTH,
    'USE_FWR': USE_FWR,
    'USE_MMS': USE_MMS
    //'USE_LINENO': USE_LINENO
  };

  const lsSettings = JSON.stringify(settings);
  window.localStorage.setItem('PA_SETTINGS', lsSettings);
}

// toggle between mm/s and mm/min speed settings
function speedToggle() {
  var SPEED_FIRSTLAYER = $('#FIRSTLAYER_SPEED').val(),
      SPEED_FILL = $('#FILL_SPEED').val(),
      SPEED_PERIMETER = $('#PERIMETER_SPEED').val(),
      SPEED_MOVE = $('#MOVE_SPEED').val(),
      SPEED_RETRACT = $('#RETRACT_SPEED').val(),
      SPEED_PRIME = $('#PRIME_SPEED').val(),
      SPEED_UNRETRACT = $('#UNRETRACT_SPEED').val();
  if ($('#MM_S').is(':checked')) {
    SPEED_FIRSTLAYER = $('#FIRSTLAYER_SPEED').val();
    SPEED_FILL = $('#PERIMETER_FILL').val();
    SPEED_PERIMETER = $('#PERIMETER_SPEED').val();
    SPEED_MOVE = $('#MOVE_SPEED').val();
    SPEED_RETRACT = $('#RETRACT_SPEED').val();
    SPEED_UNRETRACT = $('#UNRETRACT_SPEED').val();
    SPEED_PRIME = $('#PRIME_SPEED').val();
    $('#FIRSTLAYER_SPEED').val(SPEED_FIRSTLAYER / 60);
    $('#FILL_SPEED').val(SPEED_FILL / 60);
    $('#PERIMETER_SPEED').val(SPEED_PERIMETER / 60);
    $('#MOVE_SPEED').val(SPEED_MOVE / 60);
    $('#RETRACT_SPEED').val(SPEED_RETRACT / 60);
    $('#UNRETRACT_SPEED').val(SPEED_UNRETRACT / 60);
    $('#PRIME_SPEED').val(SPEED_PRIME / 60);
  } else {
    SPEED_FIRSTLAYER = $('#FIRSTLAYER_SPEED').val();
    SPEED_FILL = $('#PERIMETER_FILL').val();
    SPEED_PERIMETER = $('#PERIMETER_SPEED').val();
    SPEED_MOVE = $('#MOVE_SPEED').val();
    SPEED_RETRACT = $('#RETRACT_SPEED').val();
    SPEED_UNRETRACT = $('#UNRETRACT_SPEED').val();
    SPEED_PRIME = $('#PRIME_SPEED').val();
    $('#FIRSTLAYER_SPEED').val(SPEED_FIRSTLAYER * 60);
    $('#FILL_SPEED').val(SPEED_FILL * 60);
    $('#PERIMETER_SPEED').val(SPEED_PERIMETER * 60);
    $('#MOVE_SPEED').val(SPEED_MOVE * 60);
    $('#RETRACT_SPEED').val(SPEED_RETRACT * 60);
    $('#UNRETRACT_SPEED').val(SPEED_UNRETRACT * 60);
    $('#PRIME_SPEED').val(SPEED_PRIME * 60);
  }
}

// toggle between round and rectangular bed shape
function toggleBedShape() {
  if ($('#SHAPE_BED').val() === 'Round') {
    $('label[for=\'BEDSIZE_X\']').text('Bed Diameter:');
    $('#shape').text('Diameter (mm) of the bed');
    //$('#BEDSIZE_Y').prop('disabled', true);
    //$('label[for=BEDSIZE_Y]').css({opacity: 0.5});
    document.getElementById('bedSizeYRow').style.display = 'none';
    if (!$('#CENTER_NULL').is(':checked')) {
      $('#CENTER_NULL').prop('checked', !$('#CENTER_NULL').prop('checked'));
    }
    document.getElementById('originBedCenterRow').style.display = 'none';
  } else {
    $('label[for=\'BEDSIZE_X\']').text('Bed Size X:');
    $('#shape').text('Size (mm) of the bed in X');
    //$('#BEDSIZE_Y').prop('disabled', false);
    //$('label[for=BEDSIZE_Y]').css({opacity: 1});
    document.getElementById('bedSizeYRow').style.display = '';
    document.getElementById('originBedCenterRow').style.display = '';
  }
}

// toggle prime relevant options
/*
function togglePrime() {
  if ($('#PRIME').is(':checked')) {
    $('#PRIME_EXT').prop('disabled', false);
    $('label[for=PRIME_EXT]').css({opacity: 1});
  } else {
    $('#PRIME_EXT').prop('disabled', true);
    $('label[for=PRIME_EXT]').css({opacity: 0.5});
  }
}
*/

function toggleStartGcodeType(){
  var CANNED_GCODE = `G28 ; Home all axes
;G32                ; Tramming macro (uncomment if used)
;QUAD_GANTRY_LEVEL  ; Level flying gantry (uncomment if used)
;Z_TILT_ADJUST      ; Tilt level bed (uncomment if used)
G28 Z               ; Home Z
G90                 ; Use absolute positioning
G1 Z10 F100         ; Z raise
;BED_MESH_CALIBRATE ; Generate bed mesh (uncomment if used)
M112                ; Reading comprehension check! (emergency stop)`

  var STANDALONE_MACRO = `PRINT_START
; Make sure this macro name matches your own! 
; (Some may use START_PRINT instead, for example.)
`

  var STANDALONE_TEMP_PASSING_MACRO = `; !!!!!!! Pass your temperatures to your start macro here !!!!!!!
PRINT_START HOTEND=200 BED=60

; Make sure the macro name AND parameter names match YOUR start macro setup
; (Example, some macros use EXTRUDER=X rather than HOTEND=X)`

  if ($('#START_GCODE_TYPE').val() == "custom"){
    $('#START_GCODE').val(CANNED_GCODE);
    document.getElementById("START_GCODE_TYPE_Description").innerHTML = `<p>Use custom start g-code (below). The defaults have a lot of redundancies and are intended to be revised.</p>
You should generally be able to copy your usual start g-code from your slicer.`;
    //$('#HOTEND_TEMP').prop('disabled', false);
    //$('label[for=HOTEND_TEMP]').css({opacity: 1.0});
    //$('#BED_TEMP').prop('disabled', false);
    //$('label[for=BED_TEMP]').css({opacity: 1.0});
    document.getElementById('hotendTempRow').style.display = '';
    document.getElementById('bedTempRow').style.display = '';
  } else if ($('#START_GCODE_TYPE').val() == "standalone") {
    $('#START_GCODE').val(STANDALONE_MACRO);
    document.getElementById("START_GCODE_TYPE_Description").innerHTML = "<p>Only use if your start macro contains <font color=\"red\"><strong>all necessary start g-codes!</strong></font> (homing, quad gantry leveling, z offset, bed leveling, etc).</p>";
    //$('#HOTEND_TEMP').prop('disabled', false);
    //$('label[for=HOTEND_TEMP]').css({opacity: 1.0});
    //$('#BED_TEMP').prop('disabled', false);
    //$('label[for=BED_TEMP]').css({opacity: 1.0});
    document.getElementById('hotendTempRow').style.display = '';
    document.getElementById('bedTempRow').style.display = '';
  } else {
    $('#START_GCODE').val(STANDALONE_TEMP_PASSING_MACRO);
    document.getElementById("START_GCODE_TYPE_Description").innerHTML = `<p>Only use if your start macro contains <font color=\"red\"><strong>all necessary start g-codes</font> <i>and</i></strong> is <strong><a href=\"https://github.com/AndrewEllis93/Print-Tuning-Guide/blob/main/articles/passing_slicer_variables.md\">set up to receive variables</a></strong>!</p>
<p><strong>This will prevent temperature gcodes from being added separately.</strong> You will have to pass temperatures yourself below.</p>`;
    //$('#HOTEND_TEMP').prop('disabled', true);
    //$('label[for=HOTEND_TEMP]').css({opacity: 0.5});
    //$('#BED_TEMP').prop('disabled', true);
    //$('label[for=BED_TEMP]').css({opacity: 0.5});
    document.getElementById('hotendTempRow').style.display = 'none';
    document.getElementById('bedTempRow').style.display = 'none';
  }
}

function toggleTemps(){
  if ($('#START_GCODE_TYPE').val() == "custom"){
    document.getElementById('hotendTempRow').style.display = '';
    document.getElementById('bedTempRow').style.display = '';
  } else if ($('#START_GCODE_TYPE').val() == "standalone") {
    document.getElementById('hotendTempRow').style.display = '';
    document.getElementById('bedTempRow').style.display = '';
  } else {
    document.getElementById('hotendTempRow').style.display = 'none';
    document.getElementById('bedTempRow').style.display = 'none';
  }
}

function toggleNotes(){
  if ($('#NOTES_ENABLE').is(':checked')) {
    document.getElementById('printerNameRow').style.display = '';
    document.getElementById('filamentNameRow').style.display = '';
  } else {
    document.getElementById('printerNameRow').style.display = 'none';
    document.getElementById('filamentNameRow').style.display = 'none';
  }
}

function togglePatternOptions(){
  if ($('#PATTERN_OPTIONS_ENABLE').is(':checked')) {
    document.getElementById('printHeightRow').style.display = '';
    document.getElementById('perimetersRow').style.display = '';
    document.getElementById('patternSideLengthRow').style.display = '';
    document.getElementById('patternSpacingRow').style.display = '';
    document.getElementById('patternAngleRow').style.display = '';
    document.getElementById('printDirectionRow').style.display = '';
  } else {
    document.getElementById('printHeightRow').style.display = 'none';
    document.getElementById('perimetersRow').style.display = 'none';
    document.getElementById('patternSideLengthRow').style.display = 'none';
    document.getElementById('patternSpacingRow').style.display = 'none';
    document.getElementById('patternAngleRow').style.display = 'none';
    document.getElementById('printDirectionRow').style.display = 'none';
  }
}

function toggleAnchorOptions(){
    if ($('#ANCHOR_OPTION').val() == "anchor_frame"){
    document.getElementById('anchorPerimetersRow').style.display = '';
    document.getElementById('anchorLineRatioRow').style.display = '';
  } else if ($('#ANCHOR_OPTION').val() == "anchor_layer") {
    document.getElementById('anchorPerimetersRow').style.display = 'none';
    document.getElementById('anchorLineRatioRow').style.display = '';
  } else {
    document.getElementById('anchorPerimetersRow').style.display = 'none';
    document.getElementById('anchorLineRatioRow').style.display = 'none';
  }
}

// toggle between standard and firmware retract
function toggleRetract() {
  if ($('#USE_FWR').is(':checked')) {
    document.getElementById('retractionDistanceRow').style.display = 'none';
    document.getElementById('retractionSpeedRow').style.display = 'none';
    document.getElementById('unretractionSpeedRow').style.display = 'none';
    /*
    $('#RETRACTION').prop('disabled', true);
    $('label[for=RETRACTION]').css({opacity: 0.5});
    $('#RETRACT_SPEED').prop('disabled', true);
    $('label[for=RETRACT_SPEED]').css({opacity: 0.5});
    $('#UNRETRACT_SPEED').prop('disabled', true);
    $('label[for=UNRETRACT_SPEED]').css({opacity: 0.5});
    */
  } else {
    document.getElementById('retractionDistanceRow').style.display = '';
    document.getElementById('retractionSpeedRow').style.display = '';
    document.getElementById('unretractionSpeedRow').style.display = '';
    /*
    $('#RETRACTION').prop('disabled', false);
    $('label[for=RETRACTION]').css({opacity: 1.0});
    $('#RETRACT_SPEED').prop('disabled', false);
    $('label[for=RETRACT_SPEED]').css({opacity: 1.0});
    $('#UNRETRACT_SPEED').prop('disabled', false);
    $('label[for=UNRETRACT_SPEED]').css({opacity: 1.0});
    */
  }
}

function toggleZHop() {
  if ($('#ZHOP_ENABLE').is(':checked')) {
    document.getElementById('zhopHeightRow').style.display = '';
    //$('#ZHOP_HEIGHT').prop('disabled', false);
    //$('label[for=ZHOP_HEIGHT]').css({opacity: 1.0});
  } else {
    document.getElementById('zhopHeightRow').style.display = 'none';
    //$('#ZHOP_HEIGHT').prop('disabled', true);
    //$('label[for=ZHOP_HEIGHT]').css({opacity: 0.5});
  }
}

/*
function toggleAnchor() {
  if ($('#ANCHOR_LAYER').is(':checked')) {
    $('#ANCHOR_LAYER_LINE_RATIO').prop('disabled', false);
    $('label[for=ANCHOR_LAYER_LINE_RATIO]').css({opacity: 1.0});
  } else {
    $('#ANCHOR_LAYER_LINE_RATIO').prop('disabled', true);
    $('label[for=ANCHOR_LAYER_LINE_RATIO]').css({opacity: 0.5});
  }
}
*/

// sanity checks for pattern / bed size
function validateInput() {
  var testNaN = {
      // do not use parseInt or parseFloat for validating, since both
      // functions will have special parsing characteristics leading to
      // false numeric validation
      BEDSIZE_X: $('#BEDSIZE_X').val(),
      BEDSIZE_Y: $('#BEDSIZE_Y').val(),
      PA_START: $('#PA_START').val(),
      PA_END: $('#PA_END').val(),
      PA_STEP: $('#PA_STEP').val(),
      PATTERN_SPACING: $('#PATTERN_SPACING').val(),
      PATTERN_ANGLE: $('#PATTERN_ANGLE').val(),
      FIRSTLAYER_SPEED: $('#FIRSTLAYER_SPEED').val(),
      PERIMETER_SPEED: $('#PERIMETER_SPEED').val(),
      PATTERN_SIDE_LENGTH: $('#PATTERN_SIDE_LENGTH').val(),
      HOTEND_TEMP: $('#HOTEND_TEMP').val(),
      BED_TEMP: $('#BED_TEMP').val(),
      FIL_DIA: $('#FIL_DIA').val(),
      NOZ_DIA: $('#NOZ_DIA').val(),
      LINE_RATIO: $('#LINE_RATIO').val(),
      ANCHOR_LAYER_LINE_RATIO: $('#ANCHOR_LAYER_LINE_RATIO').val(),
      LAYER_HEIGHT: $('#LAYER_HEIGHT').val(),
      LAYER_HEIGHT_FIRSTLAYER: $('#LAYER_HEIGHT_FIRSTLAYER').val(),
      FAN_SPEED_FIRSTLAYER: $('#FAN_SPEED_FIRSTLAYER').val(),
      FAN_SPEED: $('#FAN_SPEED').val(),
      EXTRUSION_MULT: $('#EXTRUSION_MULT').val(),
      //PRIME_EXT: $('#PRIME_EXT').val(),
      MOVE_SPEED: $('#MOVE_SPEED').val(),
      RETRACT_SPEED: $('#RETRACT_SPEED').val(),
      UNRETRACT_SPEED: $('#UNRETRACT_SPEED').val(),
      PRINT_ACCL: $('#PRINT_ACCL').val(),
      ZHOP_HEIGHT: $('#ZHOP_HEIGHT').val(),
      PRINT_HEIGHT: $('#PRINT_HEIGHT').val(),
      PERIMETERS: $('#PERIMETERS').val(),
      //PRIME_SPEED: $('#PRIME_SPEED').val(),
      RETRACTION: $('#RETRACTION').val()
    },
    selectShape = $('#SHAPE_BED'),
    bedShape = selectShape.val(),
    selectDir = $('#DIR_PRINT'),
    printDir = selectDir.val(),
    //usePrime = $('#PRIME').prop('checked'),
    //useLineNo = $('#LINE_NO').prop('checked'),
    //sizeY = ((parseFloat(testNaN['PA_END']) - parseFloat(testNaN['PA_START'])) / parseFloat(testNaN['PA_STEP']) * parseFloat(testNaN['PATTERN_SPACING'])) + 25, // +25 with ref marking
    //sizeX = (2 * parseFloat(testNaN['SLOW_LENGTH'])) + parseFloat(testNaN['PATTERN_SIDE_LENGTH']) + (usePrime ? 10 : 0) + (useLineNo ? 8 : 0),
    sizeY = 999999, // TODO
    sizeX = 999999, // TODO
    printDirRad = printDir * Math.PI / 180,
    fitWidth = Math.round10(Math.abs(sizeX * Math.cos(printDirRad)) + Math.abs(sizeY * Math.sin(printDirRad)), 0),
    fitHeight = Math.round10(Math.abs(sizeX * Math.sin(printDirRad)) + Math.abs(sizeY * Math.cos(printDirRad)), 0),
    decimals = getDecimals(parseFloat(testNaN['PA_STEP'])),
    invalidDiv = 0;

  // Start clean
  $('BEDSIZE_X,#START_GCODE_TYPE,#START_GCODE,#END_GCODE,#BEDSIZE_Y,#EXTRUSION_MULT,#FAN_SPEED,#FAN_SPEED_FIRSTLAYER,#FIL_DIA,#HOTEND_TEMP,#BED_TEMP,#FIRSTLAYER_SPEED,#LAYER_HEIGHT,#LAYER_HEIGHT_FIRSTLAYER,#LINE_RATIO,#ANCHOR_LAYER_LINE_RATIO,#MOVE_SPEED,#NOZ_DIA,#PA_END,'
      + '#PA_START,#PA_STEP,#PATTERN_ANGLE,#PATTERN_SIDE_LENGTH,#PATTERN_SPACING,#PERIMETER_SPEED,#PERIMETERS,#PRINT_ACCL,#PRINT_HEIGHT,#RETRACT_SPEED,#RETRACTION,#UNRETRACT_SPEED,#ZHOP_HEIGHT').each((i,t) => {
    t.setCustomValidity('');
    const tid = $(t).attr('id');
    $(`label[for=${tid}]`).removeClass();
  });
  $('#warning1').hide();
  $('#warning2').hide();
  $('#warning3').hide();
  $('#button').prop('disabled', false);

  // Check for proper numerical values
  Object.keys(testNaN).forEach((k) => {
    if ((isNaN(testNaN[k]) && !isFinite(testNaN[k])) || testNaN[k].trim().length === 0) {
      $('label[for=' + k + ']').addClass('invalidNumber');
      $('#' + k)[0].setCustomValidity('The value is not a proper number.');
      $('#warning3').text('Some values are not proper numbers. Check highlighted Settings.');
      $('#warning3').addClass('invalidNumber');
      $('#warning3').show();
      $('#button').prop('disabled', true);
    }
  });

  // Check if Pressure Advance Stepping is a multiple of the Pressure Advance Range
  if ((Math.round10(parseFloat(testNaN['PA_END']) - parseFloat(testNaN['PA_START']), PA_round) * Math.pow(10, decimals)) % (parseFloat(testNaN['PA_STEP']) * Math.pow(10, decimals)) !== 0) {
    $('label[for=PA_START]').addClass('invalidDiv');
    $('#PA_START')[0].setCustomValidity('Pressure Advance range cannot be cleanly divided.');
    $('label[for=PA_END]').addClass('invalidDiv');
    $('#PA_END')[0].setCustomValidity('Pressure Advance range cannot be cleanly divided.');
    $('label[for=PA_STEP]').addClass('invalidDiv');
    $('#PA_STEP')[0].setCustomValidity('Pressure Advance range cannot be cleanly divided.');
    $('#warning1').text('Your Pressure Advance range cannot be cleanly divided. Check highlighted Pattern Settings.');
    $('#warning1').addClass('invalidDiv');
    $('#warning1').show();
    $('#button').prop('disabled', true);
    invalidDiv = 1;
  }

  /*
  // Check if pattern settings exceed bed size
  if (bedShape === 'Round' && (Math.sqrt(Math.pow(fitWidth, 2) + Math.pow(fitHeight, 2)) > (parseInt(testNaN['BEDSIZE_X']) - 5)) && fitHeight > fitWidth) {
    $('label[for=PA_START]').addClass('invalidSize');
    $('#PA_START')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your bed\'s diameter.');
    $('label[for=PA_END]').addClass('invalidSize');
    $('#PA_END')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your bed\'s diameter.');
    $('label[for=PA_STEP]').addClass('invalidSize');
    $('#PA_STEP')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your bed\'s diameter.');
    $('label[for=PATTERN_SPACING]').addClass('invalidSize');
    $('#PATTERN_SPACING')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your bed\'s diameter.'); // TODO: Pattern angle?
    $((invalidDiv ? '#warning2' : '#warning1')).text('Your Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your bed\'s diameter. Check highlighted Pattern Settings.');
    $((invalidDiv ? '#warning2' : '#warning1')).addClass('invalidSize');
    $((invalidDiv ? '#warning2' : '#warning1')).show();
  }

  if (bedShape === 'Round' && (Math.sqrt(Math.pow(fitWidth, 2) + Math.pow(fitHeight, 2)) > (parseInt(testNaN['BEDSIZE_X']) - 5)) && fitWidth > fitHeight) {
    $('label[for=SLOW_LENGTH]').addClass('invalidSize');
    $('#SLOW_LENGTH')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your bed\'s diameter.');
    $('label[for=PATTERN_SIDE_LENGTH]').addClass('invalidSize');
    $('#PATTERN_SIDE_LENGTH')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your bed\'s diameter.');// TODO: Pattern angle?
    $((invalidDiv ? '#warning2' : '#warning1')).text('Your Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your bed\'s diameter. Check highlighted Pattern Settings.');
    $((invalidDiv ? '#warning2' : '#warning1')).addClass('invalidSize');
    $((invalidDiv ? '#warning2' : '#warning1')).show();
  }

  if (bedShape === 'Rect' && fitWidth > (parseInt(testNaN['BEDSIZE_X']) - 5)) {
    $('label[for=SLOW_LENGTH]').addClass('invalidSize');
    $('#SLOW_LENGTH')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your X bed size.');
    $('label[for=PATTERN_SIDE_LENGTH]').addClass('invalidSize');
    $('#PATTERN_SIDE_LENGTH')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your X bed size.');// TODO: Pattern angle?
    $((invalidDiv ? '#warning2' : '#warning1')).text('Your Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your X bed size. Check highlighted Pattern Settings.');
    $((invalidDiv ? '#warning2' : '#warning1')).addClass('invalidSize');
    $((invalidDiv ? '#warning2' : '#warning1')).show();
  }

  if (bedShape === 'Rect' && fitHeight > (parseInt(testNaN['BEDSIZE_Y']) - 5)) {
    $('label[for=PA_START]').addClass('invalidSize');
    $('#PA_START')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your Y bed size.');
    $('label[for=PA_END]').addClass('invalidSize');
    $('#PA_END')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your Y bed size.');
    $('label[for=PA_STEP]').addClass('invalidSize');
    $('#PA_STEP')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your Y bed size.');
    $('label[for=PATTERN_SPACING]').addClass('invalidSize');// TODO: Pattern angle?
    $('#PATTERN_SPACING')[0].setCustomValidity('Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your Y bed size.');// TODO: Pattern angle?
    $((invalidDiv ? '#warning2' : '#warning1')).text('Your Pattern size (x: ' + fitWidth + ', y: ' + fitHeight + ') exceeds your Y bed size. Check highlighted Pattern Settings.');
    $((invalidDiv ? '#warning2' : '#warning1')).addClass('invalidSize');
    $((invalidDiv ? '#warning2' : '#warning1')).show();
  }
  */
}

$(window).load(() => {
  // Adapt textarea to cell size
  var TXTAREAHEIGHT = $('.txtareatd').height();
  $('.calibpat #gcodetextarea').css({'height': (TXTAREAHEIGHT) + 'px'});

  // create tab index dynamically
  $(':input:not(:hidden)').each(function(i) {
    $(this).attr('tabindex', i + 1);
  });

  // Get localStorage data
  var lsSettings = window.localStorage.getItem('PA_SETTINGS');

  if (lsSettings) {
    var settings = jQuery.parseJSON(lsSettings);
    //$('#USE_START_MACRO').prop('checked', settings['USE_START_MACRO']);
    //$('#NO_HEAT_GCODES').prop('checked', settings['NO_HEAT_GCODES']);
    //$('#START_MACRO').prop('checked', settings['START_MACRO']);
    //$('#START_MACRO_VAR').prop('checked', settings['START_MACRO_VAR']);
    $('#NOTES_ENABLE').prop('checked', settings['NOTES_ENABLE']);
    $('#PATTERN_OPTIONS_ENABLE').prop('checked', settings['PATTERN_OPTIONS_ENABLE']);
    $('#BED_TEMP').val(settings['BED_TEMP']);
    $('#HOTEND_TEMP').val(settings['HOTEND_TEMP']);
    $('#ANCHOR_OPTION').val(settings['ANCHOR_OPTION']);
    $('#START_GCODE_TYPE').val(settings['START_GCODE_TYPE']);
    $('#FIL_DIA').val(settings['FILAMENT_DIAMETER']);
    $('#NOZ_DIA').val(settings['NOZZLE_DIAMETER']);
    $('#LINE_RATIO').val(settings['LINE_RATIO']);
    $('#ANCHOR_LAYER_LINE_RATIO').val(settings['ANCHOR_LAYER_LINE_RATIO']);
    $('#START_GCODE').val(settings['START_GCODE']);
    $('#END_GCODE').val(settings['END_GCODE']);
    $('#FIRSTLAYER_SPEED').val(settings['SPEED_FIRSTLAYER']);
    $('#FILL_SPEED').val(settings['SPEED_FILL']);
    $('#PERIMETER_SPEED').val(settings['SPEED_PERIMETER']);
    $('#MOVE_SPEED').val(settings['SPEED_MOVE']);
    $('#RETRACT_SPEED').val(settings['SPEED_RETRACT']);
    $('#UNRETRACT_SPEED').val(settings['SPEED_UNRETRACT']);
    $('#PRINT_ACCL').val(settings['ACCELERATION']);
    $('#ZHOP_ENABLE').prop('checked', settings['ZHOP_ENABLE']);
    $('#ZHOP_HEIGHT').val(settings['ZHOP_HEIGHT']);
    $('#RETRACTION').val(settings['RETRACT_DIST']);
    $('#SHAPE_BED').val(settings['BED_SHAPE']);
    $('#BEDSIZE_X').val(settings['BED_X']);
    $('#BEDSIZE_Y').val(settings['BED_Y']);
    $('#CENTER_NULL').prop('checked', settings['NULL_CENTER']);
    $('#LAYER_HEIGHT_FIRSTLAYER').val(settings['HEIGHT_FIRSTLAYER']);
    $('#ANCHOR_LAYER').prop('checked', settings['ANCHOR_LAYER']);
    $('#LAYER_HEIGHT').val(settings['HEIGHT_LAYER']);
    $('#PRINT_HEIGHT').val(settings['HEIGHT_PRINT']);
    $('#EXTRUDER_NAME').val(settings['EXTRUDER_NAME']);
    $('#FAN_SPEED_FIRSTLAYER').val(settings['FAN_SPEED_FIRSTLAYER']);
    $('#FAN_SPEED').val(settings['FAN_SPEED']);
    $('#EXTRUSION_MULT').val(settings['EXT_MULT']);
    $('#PA_START').val(settings['PA_START']);
    $('#PA_END').val(settings['PA_END']);
    $('#PA_STEP').val(settings['PA_STEP']);
    $('#DIR_PRINT').val(settings['PRINT_DIR']);
    $('#PATTERN_SPACING').val(settings['PATTERN_SPACING']);
    $('#PATTERN_ANGLE').val(settings['PATTERN_ANGLE']);
    $('#PERIMETERS').val(settings['PERIMETERS']);
    $('#PRIME').prop('checked', settings['USE_PRIME']);
    $('#PRIME_EXT').val(settings['EXT_MULT_PRIME']);
    $('#PRIME_SPEED').val(settings['SPEED_PRIME']);
    $('#PATTERN_SIDE_LENGTH').val(settings['PATTERN_SIDE_LENGTH']);
    $('#USE_FWR').prop('checked', settings['USE_FWR']);
    $('#MM_S').prop('checked', settings['USE_MMS']);
    $('#LINE_NO').prop('checked', settings['USE_LINENO']);

    toggleBedShape();
    //togglePrime();
    toggleRetract();
    toggleZHop();
    toggleNotes();
    togglePatternOptions();
    toggleAnchorOptions();
    toggleTemps();
  }

  // toggle between mm/s and mm/min speeds
  $('#MM_S').change(speedToggle);

  // Toggle Bed Shape
  $('#SHAPE_BED').change(() => {
    toggleBedShape();
    validateInput();
  });

  // toggle prime relevant html elements
  //$('#PRIME').change(togglePrime);

  // Toggle notes fields
  $('#NOTES_ENABLE').change(toggleNotes);

  // Toggle start gcode and hotend/bed temp visibility when choosing start g-code option
  $('#START_GCODE_TYPE').change(toggleStartGcodeType);

  // Anchor frame sub-options
  $('#ANCHOR_OPTION').change(toggleAnchorOptions);

  $('#PATTERN_OPTIONS_ENABLE').change(togglePatternOptions);

  // Change retract type
  $('#USE_FWR').change(toggleRetract);

  // Toggle hop settings
  $('#ZHOP_ENABLE').change(toggleZHop);

  // Toggle anchor settings
  //$('#ANCHOR_LAYER').change(toggleAnchor);

  // Focus the first field
  //$('#padv input:first').focus();
});
