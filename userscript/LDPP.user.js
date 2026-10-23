// ==UserScript==
// @name         LD++
// @namespace    https://github.com/0-V-linuxdo/LDPP
// @version      20261023.4
// @description  LINUX DO 增强：话题屏蔽、搜索过滤、AI 总结与追问、DeArrow 标题党改写、Google Drive 同步，一个脚本、互不打架。
// @author       LD++ Contributors
// @homepageURL  https://github.com/0-V-linuxdo/LDPP
// @updateURL    https://raw.githubusercontent.com/0-V-linuxdo/LDPP/main/userscript/LDPP.meta.js
// @downloadURL  https://raw.githubusercontent.com/0-V-linuxdo/LDPP/main/userscript/LDPP.user.js
// @match        https://linux.do/*
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @connect      *
// @license      GPL-3.0-or-later
// @noframes
// ==/UserScript==

/**
 * LD++ [20261023.4] v1.0.0 — a modification for linux.do
 * (c) 2026 LD++ Contributors · GPL-3.0-or-later
 */
(() => {
  var __create = Object.create;
  var __getProtoOf = Object.getPrototypeOf;
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  function __accessProp(key) {
    return this[key];
  }
  var __toESMCache_node;
  var __toESMCache_esm;
  var __toESM = (mod, isNodeMode, target) => {
    var canCache = mod != null && typeof mod === "object";
    if (canCache) {
      var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
      var cached = cache.get(mod);
      if (cached)
        return cached;
    }
    target = mod != null ? __create(__getProtoOf(mod)) : {};
    const to = isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
    if (mod && typeof mod === "object" || typeof mod === "function") {
      for (let key of __getOwnPropNames(mod))
        if (!__hasOwnProp.call(to, key))
          __defProp(to, key, {
            get: __accessProp.bind(mod, key),
            enumerable: true
          });
    }
    if (canCache)
      cache.set(mod, to);
    return to;
  };
  var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
  var __returnValue = (v) => v;
  function __exportSetter(name, newValue) {
    this[name] = __returnValue.bind(null, newValue);
  }
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, {
        get: all[name],
        enumerable: true,
        configurable: true,
        set: __exportSetter.bind(all, name)
      });
  };

  // node_modules/usercss-meta/lib/error.js
  var require_error = __commonJS(function(exports, module) {
    class ParseError extends Error {
      constructor(err) {
        super(err.message);
        delete err.message;
        this.name = "ParseError";
        Object.assign(this, err);
      }
    }

    class MissingCharError extends ParseError {
      constructor(chars, index) {
        super({
          code: "missingChar",
          args: chars,
          message: `Missing character: ${chars.map((c) => `'${c}'`).join(", ")}`,
          index
        });
      }
    }

    class EOFError extends ParseError {
      constructor(index) {
        super({
          code: "EOF",
          message: "Unexpected end of file",
          index
        });
      }
    }
    module.exports = {
      ParseError,
      MissingCharError,
      EOFError
    };
  });

  // node_modules/usercss-meta/lib/parse-util.js
  var require_parse_util = __commonJS(function(exports, module) {
    var { ParseError, MissingCharError, EOFError } = require_error();
    var RX_EOT = /<<<EOT([\s\S]+?)EOT;/y;
    var RX_LINE = /.*/y;
    var RX_NUMBER = /-?(\d+(\.\d+)?|\.\d+)([eE]-?\d+)?\s*/y;
    var RX_WHITESPACE = /\s*/y;
    var RX_WHITESPACE_SAMELINE = /[^\S\n]*/y;
    var RX_WORD = /([\w-]+)\s*/y;
    var RX_STRING_BACKTICK = /(`(?:\\`|[\s\S])*?`)/y;
    var RX_STRING_QUOTED = /((['"])(?:\\\2|[^\n])*?\2|\w+)/y;
    var RX_STRING_UNQUOTED = /[^"]*/y;
    var RX_VERSION = /^v?\d+(\.\d+)*(?:-(\w[-\w]*(\.[-\w]+)*))?(?:\+(\w[-\w]*(\.[-\w]+)*))?$/;
    var JSON_PRIME = {
      __proto__: null,
      null: null,
      true: true,
      false: false
    };
    function unescapeComment(s) {
      return s.replace(/\*\\\//g, "*/");
    }
    function unquote(s) {
      const q = s[0];
      if (q === s[s.length - 1] && (q === '"' || q === "'" || q === "`")) {
        return s.slice(1, -1).replace(new RegExp(`\\\\([${q}\\\\/bfnrt]|u[0-9a-fA-F]{4})`, "g"), (s) => {
          if (s[1] === q) {
            return q;
          }
          return JSON.parse(`"${s}"`);
        });
      }
      return unescapeComment(s);
    }
    function eatLine(state) {
      RX_LINE.lastIndex = state.lastIndex;
      RX_LINE.exec(state.text);
      state.lastIndex = RX_LINE.lastIndex;
    }
    function eatWhitespace(state) {
      RX_WHITESPACE.lastIndex = state.lastIndex;
      state.lastIndex += RX_WHITESPACE.exec(state.text)[0].length;
    }
    function eatSameLineWhitespace(state) {
      RX_WHITESPACE_SAMELINE.lastIndex = state.lastIndex;
      state.lastIndex += RX_WHITESPACE_SAMELINE.exec(state.text)[0].length;
    }
    function parseChar(state) {
      if (state.lastIndex >= state.text.length) {
        throw new EOFError(state.lastIndex);
      }
      state.index = state.lastIndex;
      state.value = state.text[state.lastIndex];
      state.lastIndex++;
      eatWhitespace(state);
    }
    function parseWord(state) {
      const pos = state.lastIndex;
      RX_WORD.lastIndex = pos;
      const match = RX_WORD.exec(state.text);
      if (!match) {
        throw new ParseError({
          code: "invalidWord",
          message: "Invalid word",
          index: pos
        });
      }
      state.index = pos;
      state.value = match[1];
      state.lastIndex += match[0].length;
    }
    function parseJSON(state) {
      const pos = state.lastIndex;
      try {
        parseJSONValue(state);
      } catch (err) {
        err.message = `Invalid JSON: ${err.message}`;
        throw err;
      }
      state.index = pos;
    }
    function parseEOT(state) {
      const pos = state.lastIndex;
      RX_EOT.lastIndex = pos;
      const match = RX_EOT.exec(state.text);
      if (!match) {
        throw new ParseError({
          code: "missingEOT",
          message: "Missing EOT",
          index: pos
        });
      }
      state.index = pos;
      state.lastIndex += match[0].length;
      state.value = unescapeComment(match[1].trim());
      eatWhitespace(state);
    }
    function parseStringUnquoted(state) {
      RX_STRING_UNQUOTED.lastIndex = state.lastIndex;
      const match = RX_STRING_UNQUOTED.exec(state.text);
      state.index = state.lastIndex;
      state.lastIndex = RX_STRING_UNQUOTED.lastIndex;
      state.value = match[0].trim().replace(/\s+/g, "-");
    }
    function parseString(state, sameLine = false) {
      const pos = state.lastIndex;
      const rx = state.text[pos] === "`" ? RX_STRING_BACKTICK : RX_STRING_QUOTED;
      rx.lastIndex = pos;
      const match = rx.exec(state.text);
      if (!match) {
        throw new ParseError({
          code: "invalidString",
          message: "Invalid string",
          index: pos
        });
      }
      state.index = pos;
      state.lastIndex += match[0].length;
      state.value = unquote(match[1]);
      if (sameLine) {
        eatSameLineWhitespace(state);
      } else {
        eatWhitespace(state);
      }
    }
    function parseJSONValue(state) {
      const { text } = state;
      if (text[state.lastIndex] === "{") {
        const object = {};
        state.lastIndex++;
        eatWhitespace(state);
        while (text[state.lastIndex] !== "}") {
          parseString(state);
          const key = state.value;
          if (text[state.lastIndex] !== ":") {
            throw new MissingCharError([":"], state.lastIndex);
          }
          state.lastIndex++;
          eatWhitespace(state);
          parseJSONValue(state);
          object[key] = state.value;
          if (text[state.lastIndex] === ",") {
            state.lastIndex++;
            eatWhitespace(state);
          } else if (text[state.lastIndex] !== "}") {
            throw new MissingCharError([",", "}"], state.lastIndex);
          }
        }
        state.lastIndex++;
        eatWhitespace(state);
        state.value = object;
      } else if (text[state.lastIndex] === "[") {
        const array = [];
        state.lastIndex++;
        eatWhitespace(state);
        while (text[state.lastIndex] !== "]") {
          parseJSONValue(state);
          array.push(state.value);
          if (text[state.lastIndex] === ",") {
            state.lastIndex++;
            eatWhitespace(state);
          } else if (text[state.lastIndex] !== "]") {
            throw new MissingCharError([",", "]"], state.lastIndex);
          }
        }
        state.lastIndex++;
        eatWhitespace(state);
        state.value = array;
      } else if (text[state.lastIndex] === '"' || text[state.lastIndex] === "'" || text[state.lastIndex] === "`") {
        parseString(state);
      } else if (/[-\d.]/.test(text[state.lastIndex])) {
        parseNumber(state);
      } else {
        parseWord(state);
        if (!(state.value in JSON_PRIME)) {
          throw new ParseError({
            code: "unknownJSONLiteral",
            args: [state.value],
            message: `Unknown literal '${state.value}'`,
            index: state.index
          });
        }
        state.value = JSON_PRIME[state.value];
      }
    }
    function parseNumber(state) {
      const pos = state.lastIndex;
      RX_NUMBER.lastIndex = pos;
      const match = RX_NUMBER.exec(state.text);
      if (!match) {
        throw new ParseError({
          code: "invalidNumber",
          message: "Invalid number",
          index: pos
        });
      }
      state.index = pos;
      state.value = Number(match[0].trim());
      state.lastIndex += match[0].length;
    }
    function parseStringToEnd(state) {
      RX_LINE.lastIndex = state.lastIndex;
      const match = RX_LINE.exec(state.text);
      const value = match[0].trim();
      if (!value) {
        throw new ParseError({
          code: "missingValue",
          message: "Missing value",
          index: RX_LINE.lastIndex
        });
      }
      state.index = state.lastIndex;
      state.value = unquote(value);
      state.lastIndex = RX_LINE.lastIndex;
    }
    function isValidVersion(version) {
      return RX_VERSION.test(version);
    }
    module.exports = {
      eatLine,
      eatWhitespace,
      parseChar,
      parseEOT,
      parseJSON,
      parseNumber,
      parseString,
      parseStringToEnd,
      parseStringUnquoted,
      parseWord,
      unquote,
      isValidVersion
    };
  });

  // node_modules/usercss-meta/shim/url.js
  var require_url = __commonJS(function(exports) {
    exports.URL = self.URL;
  });

  // node_modules/usercss-meta/data/units.js
  var require_units = __commonJS(function(exports, module) {
    module.exports = ["em", "ex", "cap", "ch", "ic", "rem", "lh", "rlh", "vw", "vh", "vi", "vb", "vmin", "vmax", "cm", "mm", "Q", "in", "pt", "pc", "px", "deg", "grad", "rad", "turn", "s", "ms", "Hz", "kHz", "dpi", "dpcm", "dppx", "%"];
  });

  // node_modules/usercss-meta/lib/levensthein-distance.js
  var require_levensthein_distance = __commonJS(function(exports, module) {
    function range(amount) {
      const range = Array(amount);
      for (let i = 0;i < amount; i++) {
        range[i] = i;
      }
      return range;
    }
    function LevenshteinDistanceWithMax(firstString, secondString, maxEdit) {
      const lenOne = firstString.length;
      const lenTwo = secondString.length;
      const lenDiff = Math.abs(lenOne - lenTwo);
      if (lenDiff > maxEdit) {
        return false;
      }
      let prevRowDistance = range(lenOne + 1);
      let currentRowDistance = Array(lenOne + 1);
      for (let i = 1;i <= lenTwo; i++) {
        currentRowDistance[0] = i;
        let minDistance = i;
        for (let j = 1;j <= lenOne; j++) {
          const editCost = firstString[j - 1] === secondString[i - 1] ? 0 : 1;
          const addCost = prevRowDistance[j] + 1;
          const delCost = currentRowDistance[j - 1] + 1;
          const substitionCost = prevRowDistance[j - 1] + editCost;
          currentRowDistance[j] = Math.min(addCost, delCost, substitionCost);
          if (currentRowDistance[j] < minDistance) {
            minDistance = currentRowDistance[j];
          }
        }
        if (minDistance > maxEdit) {
          return false;
        }
        const vtemp = currentRowDistance;
        currentRowDistance = prevRowDistance;
        prevRowDistance = vtemp;
      }
      return prevRowDistance[lenOne] <= maxEdit;
    }
    module.exports = {
      LevenshteinDistanceWithMax
    };
  });

  // node_modules/usercss-meta/lib/parse.js
  var require_parse = __commonJS(function(exports, module) {
    var { URL: URL2 } = require_url();
    var UNITS = require_units();
    var { ParseError, MissingCharError } = require_error();
    var { LevenshteinDistanceWithMax } = require_levensthein_distance();
    var {
      eatLine,
      eatWhitespace,
      parseEOT,
      parseJSON,
      parseString,
      parseStringToEnd,
      parseStringUnquoted,
      parseWord,
      parseChar,
      isValidVersion
    } = require_parse_util();
    var UNITS_SET = new Set(UNITS);
    var DEFAULT_PARSER = {
      name: parseStringToEnd,
      version: parseStringToEnd,
      namespace: parseStringToEnd,
      author: parseStringToEnd,
      description: parseStringToEnd,
      homepageURL: parseStringToEnd,
      supportURL: parseStringToEnd,
      updateURL: parseStringToEnd,
      license: parseStringToEnd,
      preprocessor: parseStringToEnd
    };
    var DEFAULT_VALIDATOR = {
      version: validateVersion,
      homepageURL: validateURL,
      supportURL: validateURL,
      updateURL: validateURL
    };
    var DEFAULT_VAR_PARSER = {
      text: parseStringToEnd,
      color: parseStringToEnd,
      checkbox: parseChar,
      select: parseSelect,
      dropdown: {
        advanced: parseVarXStyle
      },
      image: {
        var: parseSelect,
        advanced: parseVarXStyle
      },
      number: parseRange,
      range: parseRange
    };
    var DEFAULT_VAR_VALIDATOR = {
      checkbox: validateCheckbox,
      number: validateRange,
      range: validateRange
    };
    var MANDATORY_META = ["name", "namespace", "version"];
    var RANGE_PROPS = ["default", "min", "max", "step"];
    function parseRange(state) {
      parseJSON(state);
      const result = {
        min: null,
        max: null,
        step: null,
        units: null
      };
      if (typeof state.value === "number") {
        result.default = state.value;
      } else if (Array.isArray(state.value)) {
        let i = 0;
        for (const item of state.value) {
          if (typeof item === "string") {
            if (result.units != null) {
              throw new ParseError({
                code: "invalidRangeMultipleUnits",
                message: "units is alredy defined",
                args: [state.type],
                index: state.valueIndex
              });
            }
            result.units = item;
          } else if (typeof item === "number" || item === null) {
            if (i >= RANGE_PROPS.length) {
              throw new ParseError({
                code: "invalidRangeTooManyValues",
                message: "the array contains too many values",
                args: [state.type],
                index: state.valueIndex
              });
            }
            result[RANGE_PROPS[i++]] = item;
          } else {
            throw new ParseError({
              code: "invalidRangeValue",
              message: "value must be number, string, or null",
              args: [state.type],
              index: state.valueIndex
            });
          }
        }
      } else {
        throw new ParseError({
          code: "invalidRange",
          message: "the default value must be an array or a number",
          index: state.valueIndex,
          args: [state.type]
        });
      }
      state.value = result.default;
      Object.assign(state.varResult, result);
    }
    function parseSelect(state) {
      parseJSON(state);
      if (typeof state.value !== "object" || !state.value) {
        throw new ParseError({
          code: "invalidSelect",
          message: "The value must be an array or object"
        });
      }
      const options = Array.isArray(state.value) ? state.value.map((key) => createOption(key)) : Object.keys(state.value).map((key) => createOption(key, state.value[key]));
      if (new Set(options.map((o) => o.name)).size < options.length) {
        throw new ParseError({
          code: "invalidSelectNameDuplicated",
          message: "Option name is duplicated"
        });
      }
      if (options.length === 0) {
        throw new ParseError({
          code: "invalidSelectEmptyOptions",
          message: "Option list is empty"
        });
      }
      const defaults = options.filter((o) => o.isDefault);
      if (defaults.length > 1) {
        throw new ParseError({
          code: "invalidSelectMultipleDefaults",
          message: "multiple default values"
        });
      }
      options.forEach((o) => {
        delete o.isDefault;
      });
      state.varResult.options = options;
      state.value = (defaults.length > 0 ? defaults[0] : options[0]).name;
    }
    function parseVarXStyle(state) {
      const pos = state.lastIndex;
      if (state.text[state.lastIndex] !== "{") {
        throw new MissingCharError(["{"], pos);
      }
      const options = [];
      state.lastIndex++;
      while (state.text[state.lastIndex] !== "}") {
        const option = {};
        parseStringUnquoted(state);
        option.name = state.value;
        parseString(state);
        option.label = state.value;
        if (state.type === "dropdown") {
          parseEOT(state);
        } else {
          parseString(state);
        }
        option.value = state.value;
        options.push(option);
      }
      state.lastIndex++;
      eatWhitespace(state);
      if (options.length === 0) {
        throw new ParseError({
          code: "invalidSelectEmptyOptions",
          message: "Option list is empty",
          index: pos
        });
      }
      if (state.type === "dropdown") {
        state.varResult.type = "select";
        state.type = "select";
      }
      state.varResult.options = options;
      state.value = options[0].name;
    }
    function createOption(label, value) {
      if (typeof label !== "string" || value && typeof value !== "string") {
        throw new ParseError({
          code: "invalidSelectValue",
          message: "Values in the object/array must be strings"
        });
      }
      let isDefault = false;
      if (label.endsWith("*")) {
        isDefault = true;
        label = label.slice(0, -1);
      }
      let name;
      const match = label.match(/^(\w+):(.*)/);
      if (match) {
        [, name, label] = match;
      }
      if (!name) {
        name = label;
      }
      if (!label) {
        throw new ParseError({
          code: "invalidSelectLabel",
          message: "Option label is empty"
        });
      }
      if (value == null) {
        value = name;
      }
      return { name, label, value, isDefault };
    }
    function collectErrors(fn, errors) {
      if (errors) {
        try {
          fn();
        } catch (err) {
          errors.push(err);
        }
      } else {
        fn();
      }
    }
    function validateVersion(state) {
      if (!isValidVersion(state.value)) {
        throw new ParseError({
          code: "invalidVersion",
          args: [state.value],
          message: `Invalid version: ${state.value}`,
          index: state.valueIndex
        });
      }
      state.value = normalizeVersion(state.value);
    }
    function validateURL(state) {
      let url;
      try {
        url = new URL2(state.value);
      } catch (err) {
        err.args = [state.value];
        err.index = state.valueIndex;
        throw err;
      }
      if (!/^https?:/.test(url.protocol)) {
        throw new ParseError({
          code: "invalidURLProtocol",
          args: [url.protocol],
          message: `Invalid protocol: ${url.protocol}`,
          index: state.valueIndex
        });
      }
    }
    function validateCheckbox(state) {
      if (state.value !== "1" && state.value !== "0") {
        throw new ParseError({
          code: "invalidCheckboxDefault",
          message: "value must be 0 or 1",
          index: state.valueIndex
        });
      }
    }
    function validateRange(state) {
      const value = state.value;
      if (typeof value !== "number") {
        throw new ParseError({
          code: "invalidRangeDefault",
          message: `the default value of @var ${state.type} must be a number`,
          index: state.valueIndex,
          args: [state.type]
        });
      }
      const result = state.varResult;
      if (result.min != null && value < result.min) {
        throw new ParseError({
          code: "invalidRangeMin",
          message: "the value is smaller than the minimum",
          index: state.valueIndex,
          args: [state.type]
        });
      }
      if (result.max != null && value > result.max) {
        throw new ParseError({
          code: "invalidRangeMax",
          message: "the value is larger than the maximum",
          index: state.valueIndex,
          args: [state.type]
        });
      }
      if (result.step != null && [value, result.min, result.max].some((n) => n != null && !isMultipleOf(n, result.step))) {
        throw new ParseError({
          code: "invalidRangeStep",
          message: "the value is not a multiple of the step",
          index: state.valueIndex,
          args: [state.type]
        });
      }
      if (result.units && !UNITS_SET.has(result.units)) {
        throw new ParseError({
          code: "invalidRangeUnits",
          message: `Invalid CSS unit: ${result.units}`,
          index: state.valueIndex,
          args: [state.type, result.units]
        });
      }
    }
    function isMultipleOf(value, step) {
      const n = Math.abs(value / step);
      const nInt = Math.round(n);
      return Math.abs(n - nInt) < Math.pow(10, `${nInt}`.length - 16);
    }
    function createParser({
      unknownKey = "ignore",
      mandatoryKeys = MANDATORY_META,
      parseKey: userParseKey,
      parseVar: userParseVar,
      validateKey: userValidateKey,
      validateVar: userValidateVar,
      allowErrors = false
    } = {}) {
      if (!["ignore", "assign", "throw"].includes(unknownKey)) {
        throw new TypeError("unknownKey must be 'ignore', 'assign', or 'throw'");
      }
      const parser = Object.assign(Object.create(null), DEFAULT_PARSER, userParseKey);
      const keysOfParser = [...Object.keys(parser), "advanced", "var"];
      const varParser = Object.assign({}, DEFAULT_VAR_PARSER, userParseVar);
      const validator = Object.assign({}, DEFAULT_VALIDATOR, userValidateKey);
      const varValidator = Object.assign({}, DEFAULT_VAR_VALIDATOR, userValidateVar);
      return { parse, validateVar };
      function validateVar(varObject) {
        const state = {
          key: "var",
          type: varObject.type,
          value: varObject.value,
          varResult: varObject
        };
        _validateVar(state);
      }
      function _validateVar(state) {
        const validate = typeof varValidator[state.type] === "object" ? varValidator[state.type][state.key] : varValidator[state.type];
        if (validate) {
          validate(state);
        }
      }
      function parseVar(state) {
        const result = {
          type: null,
          label: null,
          name: null,
          value: null,
          default: null,
          options: null
        };
        state.varResult = result;
        parseWord(state);
        state.type = state.value;
        result.type = state.type;
        const doParse = typeof varParser[state.type] === "object" ? varParser[state.type][state.key] : varParser[state.type];
        if (!doParse) {
          throw new ParseError({
            code: "unknownVarType",
            message: `Unknown @${state.key} type: ${state.type}`,
            args: [state.key, state.type],
            index: state.index
          });
        }
        parseWord(state);
        result.name = state.value;
        parseString(state, true);
        result.label = state.value;
        state.valueIndex = state.lastIndex;
        doParse(state);
        _validateVar(state);
        result.default = state.value;
        if (!state.usercssData.vars) {
          state.usercssData.vars = {};
        }
        state.usercssData.vars[result.name] = result;
        if (state.key === "advanced") {
          state.maybeUSO = true;
        }
      }
      function parse(text) {
        if (text.includes("\r")) {
          throw new TypeError("metadata includes invalid character: '\\r'");
        }
        const usercssData = {};
        const errors = [];
        const re = /@([\w-]+)[^\S\r\n]*/gm;
        const state = {
          index: 0,
          lastIndex: 0,
          text,
          usercssData,
          warn: (err) => errors.push(err)
        };
        let match;
        while (match = re.exec(text)) {
          state.index = match.index;
          state.lastIndex = re.lastIndex;
          state.key = match[1];
          state.shouldIgnore = false;
          collectErrors(() => {
            try {
              if (state.key === "var" || state.key === "advanced") {
                parseVar(state);
              } else {
                parseKey(state);
              }
            } catch (err) {
              if (err.index === undefined) {
                err.index = state.index;
              }
              throw err;
            }
            if (state.key !== "var" && state.key !== "advanced" && !state.shouldIgnore) {
              usercssData[state.key] = state.value;
            }
          }, allowErrors && errors);
          re.lastIndex = state.lastIndex;
        }
        if (state.maybeUSO && !usercssData.preprocessor) {
          usercssData.preprocessor = "uso";
        }
        collectErrors(() => {
          const missing = mandatoryKeys.filter((k) => !Object.prototype.hasOwnProperty.call(usercssData, k) || !usercssData[k]);
          if (missing.length > 0) {
            throw new ParseError({
              code: "missingMandatory",
              args: missing,
              message: `Missing metadata: ${missing.map((k) => `@${k}`).join(", ")}`
            });
          }
        }, allowErrors && errors);
        return {
          metadata: usercssData,
          errors
        };
      }
      function parseKey(state) {
        let doParse = parser[state.key];
        if (!doParse) {
          if (unknownKey === "assign") {
            doParse = parseStringToEnd;
          } else {
            eatLine(state);
            if (unknownKey === "ignore") {
              state.shouldIgnore = true;
              return;
            }
            const MAX_EDIT = Math.log2(state.key.length);
            const maybeSuggestion = keysOfParser.find((metaKey) => LevenshteinDistanceWithMax(metaKey, state.key, MAX_EDIT));
            throw new ParseError({
              code: "unknownMeta",
              args: [state.key, maybeSuggestion],
              message: `Unknown metadata: @${state.key}${maybeSuggestion ? `, did you mean @${maybeSuggestion}?` : ""}`,
              index: state.index
            });
          }
        }
        state.valueIndex = state.lastIndex;
        doParse(state);
        if (validator[state.key]) {
          validator[state.key](state);
        }
      }
    }
    function normalizeVersion(version) {
      if (version[0] === "v" || version[0] === "=") {
        return version.slice(1);
      }
      return version;
    }
    module.exports = {
      parse(text, options) {
        return createParser(options).parse(text);
      },
      createParser,
      isMultipleOf
    };
  });

  // node_modules/usercss-meta/lib/stringify.js
  var require_stringify = __commonJS(function(exports, module) {
    function createStringifier({
      alignKeys = false,
      space = 2,
      format = "stylus",
      stringifyKey: userStringifyKey = {},
      stringifyVar: userStringifyVar = {}
    } = {}) {
      function stringify(meta) {
        let varKey;
        if (format === "stylus") {
          varKey = "var";
        } else if (format === "xstyle") {
          varKey = "advanced";
        } else {
          throw new TypeError("options.format must be 'stylus' or 'xstyle'");
        }
        const lines = [];
        for (const key of Object.keys(meta)) {
          const value = meta[key];
          if (Object.prototype.hasOwnProperty.call(userStringifyKey, key)) {
            const result = userStringifyKey[key](value);
            if (Array.isArray(result)) {
              lines.push.apply(lines, result.map((v) => [key, v]));
            } else {
              lines.push([key, result]);
            }
          } else if (key === "vars") {
            for (const va of Object.values(value)) {
              lines.push([varKey, stringifyVar(va, format, userStringifyVar, space)]);
            }
          } else if (Array.isArray(value)) {
            for (const subLine of value) {
              lines.push([key, quoteIfNeeded(subLine)]);
            }
          } else {
            lines.push([key, quoteIfNeeded(value)]);
          }
        }
        const maxKeyLength = alignKeys ? Math.max.apply(null, lines.map((l) => l[0].length)) : 0;
        return `/* ==UserStyle==
${escapeComment(lines.map(([key, text]) => `@${key.padEnd(maxKeyLength)} ${text}`).join(`
`))}
==/UserStyle== */`;
      }
      return { stringify };
    }
    function stringifyVar(va, format, userStringifyVar, space) {
      return `${vaType()} ${va.name} ${JSON.stringify(va.label)} ${vaDefault()}`;
      function vaType() {
        if (format === "xstyle" && va.type === "select") {
          return "dropdown";
        }
        return va.type;
      }
      function vaDefault() {
        if (Object.prototype.hasOwnProperty.call(userStringifyVar, va.type)) {
          return userStringifyVar[va.type](va, format, space);
        }
        if (va.options) {
          if (format === "stylus") {
            return JSON.stringify(va.options.reduce((object, opt) => {
              const isDefault = opt.name === va.default ? "*" : "";
              object[`${opt.name}:${opt.label}${isDefault}`] = opt.value;
              return object;
            }, {}), null, space);
          }
          return stringifyEOT(va.options, va.type === "image", space);
        }
        if (va.type === "text" && format === "xstyle") {
          return JSON.stringify(va.default);
        }
        if (va.type === "number" || va.type === "range") {
          const output = [va.default, va.min, va.max, va.step];
          if (va.units) {
            output.push(va.units);
          }
          return JSON.stringify(output);
        }
        return va.default;
      }
    }
    function quoteIfNeeded(text) {
      if (typeof text === "string" && text.includes(`
`)) {
        return JSON.stringify(text);
      }
      return text;
    }
    function escapeComment(text) {
      return text.replace(/\*\//g, "*\\/");
    }
    function stringifyEOT(options, singleLine = false, space = 0) {
      const pad = typeof space === "string" ? space : " ".repeat(space);
      return `{
${options.map((o) => `${pad}${o.name} ${JSON.stringify(o.label)} ${oValue(o.value)}`).join(`
`)}
}`;
      function oValue(value) {
        if (singleLine) {
          return JSON.stringify(value);
        }
        return `<<<EOT
${value} EOT;`;
      }
    }
    module.exports = {
      stringify(meta, options) {
        return createStringifier(options).stringify(meta);
      },
      createStringifier
    };
  });

  // node_modules/usercss-meta/index.js
  var require_usercss_meta = __commonJS(function(exports, module) {
    var util = require_parse_util();
    var { ParseError } = require_error();
    var { parse, createParser } = require_parse();
    var { stringify, createStringifier } = require_stringify();
    module.exports = {
      ParseError,
      util,
      parse,
      createParser,
      stringify,
      createStringifier
    };
  });

  // src/LDPP.ts
  var exports_LDPP = {};
  __export(exports_LDPP, {
    AI: () => exports_AI,
    DataStore: () => exports_DataStore,
    PlainSettings: () => PlainSettings,
    Settings: () => Settings,
    SettingsStore: () => SettingsStore2,
    TopicList: () => exports_TopicList,
    closeAllDialogs: () => closeAllDialogs,
    confirmDialog: () => confirmDialog,
    currentRoute: () => currentRoute,
    dispatch: () => dispatch,
    init: () => init,
    isPluginEnabled: () => isPluginEnabled,
    openDialog: () => openDialog,
    plugins: () => plugins,
    setPluginEnabled: () => setPluginEnabled,
    showToast: () => showToast,
    startPlugin: () => startPlugin,
    stopPlugin: () => stopPlugin,
    subscribe: () => subscribe,
    version: () => version
  });

  // src/api/DataStore.ts
  var exports_DataStore = {};
  __export(exports_DataStore, {
    ALL_STORES: () => ALL_STORES,
    DeArrowStates: () => DeArrowStates,
    Questions: () => Questions,
    RecordStore: () => RecordStore,
    Summaries: () => Summaries,
    Summarized: () => Summarized,
    addQuestion: () => addQuestion,
    addSummary: () => addSummary,
    hasSummary: () => hasSummary,
    initDataStores: () => initDataStores
  });

  // src/api/TopicList.ts
  var exports_TopicList = {};
  __export(exports_TopicList, {
    displayedTitle: () => displayedTitle,
    flashRow: () => flashRow,
    flushNow: () => flushNow,
    focusTopic: () => focusTopic,
    getPanelRow: () => getPanelRow,
    getPassCount: () => getPassCount,
    getRows: () => getRows,
    isRevealHidden: () => isRevealHidden,
    onPass: () => onPass,
    registerDecorator: () => registerDecorator,
    registerFilter: () => registerFilter,
    registerProcessor: () => registerProcessor,
    removePanelRow: () => removePanelRow,
    rowsForTopic: () => rowsForTopic,
    schedule: () => schedule,
    setRevealHidden: () => setRevealHidden,
    setTitleMark: () => setTitleMark,
    setTitleOverride: () => setTitleOverride,
    setTitlePreview: () => setTitlePreview,
    startTopicList: () => startTopicList,
    unregisterDecorator: () => unregisterDecorator,
    unregisterFilter: () => unregisterFilter,
    unregisterProcessor: () => unregisterProcessor,
    visibleRows: () => visibleRows
  });

  // src/api/AI.ts
  var exports_AI = {};
  __export(exports_AI, {
    AIError: () => AIError,
    DEFAULT_PROFILE: () => DEFAULT_PROFILE,
    chat: () => chat,
    chatWithRetry: () => chatWithRetry,
    configureAI: () => configureAI,
    describeError: () => describeError,
    getProfile: () => getProfile,
    getProfiles: () => getProfiles,
    isRetryable: () => isRetryable,
    normalizeProfile: () => normalizeProfile,
    requireProfile: () => requireProfile,
    userContent: () => userContent
  });

  // src/utils/misc.ts
  var pageWindow = typeof unsafeWindow !== "undefined" && unsafeWindow ? unsafeWindow : globalThis;
  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted)
        return reject(abortError());
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(timer);
        reject(abortError());
      };
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
  function abortError(message = "已取消") {
    const error = new Error(message);
    error.name = "AbortError";
    return error;
  }
  function isAbortError(error) {
    return error?.name === "AbortError";
  }
  function debounce(fn, ms) {
    let timer = null;
    const run = (...args) => {
      if (timer)
        clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn(...args);
      }, ms);
    };
    run.cancel = () => {
      if (timer)
        clearTimeout(timer);
      timer = null;
    };
    return run;
  }
  function randomId(prefix = "") {
    return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
  function errorMessage(error) {
    if (error instanceof Error)
      return error.message || error.name;
    if (typeof error === "string")
      return error;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  function mapGetOrCreate(map, key, create) {
    let value = map.get(key);
    if (value === undefined) {
      value = create();
      map.set(key, value);
    }
    return value;
  }
  var pad2 = (value) => String(value).padStart(2, "0");
  function todayStamp(date = new Date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }
  function downloadJson(data, fileName) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function pickFiles(accept, multiple = false) {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = multiple;
      input.hidden = true;
      input.setAttribute("data-ldpp", "file-picker");
      input.addEventListener("cancel", () => {
        input.remove();
        reject(abortError("未选择文件"));
      }, { once: true });
      input.addEventListener("change", () => {
        input.remove();
        const files = [...input.files ?? []];
        if (files.length)
          resolve(files);
        else
          reject(abortError("未选择文件"));
      }, { once: true });
      document.body.append(input);
      input.click();
    });
  }
  async function pickJsonFile() {
    const [file] = await pickFiles(".json,application/json");
    const text = await file.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("文件不是有效的 JSON");
    }
  }
  async function copyText(text) {
    if (typeof GM_setClipboard === "function") {
      GM_setClipboard(text);
      return;
    }
    await navigator.clipboard.writeText(text);
  }

  // src/utils/css.ts
  var registry = new Map;
  var active = new Map;
  var root = null;
  function container() {
    if (root?.isConnected)
      return root;
    const host = document.head ?? document.documentElement;
    if (!host)
      return null;
    root = document.createElement("ldpp-styles");
    root.dataset.ldpp = "styles";
    host.appendChild(root);
    for (const [name, el] of active) {
      if (el.isConnected)
        continue;
      const fresh = createStyle(name, registry.get(name) ?? "");
      fresh.disabled = el.disabled;
      root.appendChild(fresh);
      active.set(name, fresh);
    }
    return root;
  }
  function createStyle(name, css) {
    const el = document.createElement("style");
    el.dataset.ldppStyle = name;
    el.textContent = css;
    return el;
  }
  function registerStyle(name, css) {
    registry.set(name, css);
    const existing = active.get(name);
    if (existing) {
      if (existing.textContent !== css)
        existing.textContent = css;
      existing.disabled = false;
      container();
      return;
    }
    const host = container();
    const el = createStyle(name, css);
    active.set(name, el);
    host?.appendChild(el);
  }
  function enableStyle(name) {
    const el = active.get(name);
    if (el) {
      el.disabled = false;
      return true;
    }
    const css = registry.get(name);
    if (css == null)
      return false;
    registerStyle(name, css);
    return true;
  }
  function disableStyle(name) {
    const el = active.get(name);
    if (!el)
      return false;
    el.disabled = true;
    return true;
  }
  function unregisterStyle(name) {
    active.get(name)?.remove();
    active.delete(name);
    registry.delete(name);
  }
  function classes(...names) {
    return names.filter(Boolean).join(" ");
  }

  // ldpp-css:src/components/core.css
  registerStyle("core", `:root {
    --ldpp-bg: var(--secondary, #fff);
    --ldpp-fg: var(--primary, #222);
    --ldpp-muted: var(--primary-medium, #888);
    --ldpp-line: var(--primary-low, #e5e5e5);
    --ldpp-soft: var(--primary-very-low, #f6f6f6);
    --ldpp-accent: var(--tertiary, #0088cc);
    --ldpp-accent-soft: var(--tertiary-low, #d1f0ff);
    --ldpp-danger: var(--danger, #e45735);
    --ldpp-success: var(--success, #1ca551);
    --ldpp-warning: #d89614;
    --ldpp-radius: 8px;
    --ldpp-dearrow-lane: 2.75rem;
    --ldpp-btn-radius: var(--d-button-border-radius, 4px);
    --ldpp-flat-icon: var(--d-button-flat-icon-color, var(--primary-low-mid, #8f8f8f));
    --ldpp-flat-icon-hover: var(--d-button-flat-icon-color--hover, var(--primary, #222));
    --ldpp-flat-text: var(--primary-high, #4d4d4d);
    --ldpp-flat-text-hover: var(--d-button-flat-text-color--hover, var(--primary, #222));
    --ldpp-flat-bg-hover: var(--d-button-flat-bg-color--hover, var(--d-hover, var(--primary-low, #e9e9e9)));
    --ldpp-flat-bg-focus: var(--d-button-flat-bg-color--focus, var(--ldpp-flat-bg-hover));
    --ldpp-press: linear-gradient(rgb(0 0 0 / 12%), rgb(0 0 0 / 12%));
    --ldpp-shadow: 0 12px 32px rgb(0 0 0 / 22%);
    --ldpp-font-sm: var(--font-down-1, 0.875em);
}

.ldpp-icon {
    display: block;
    flex: none;
}

tr.topic-list-item.ldpp-hidden,
tr.topic-list-item.ldpp-hidden + tr.ldpp-panel-row {
    display: none !important;
}

tr.topic-list-item.ldpp-revealed > td {
    background-color: color-mix(in srgb, var(--ldpp-danger) 12%, transparent) !important;
}

/* A rewritten title replaces the emoji too; typo fixes keep them. */
.ldpp-title-overridden:not(.ldpp-title-edited) img.emoji {
    display: none;
}

.ldpp-actions {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-inline-start: auto;
    padding-inline-start: 0.5rem;
    contain: layout;
}

.ldpp-slot {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
}

.ldpp-slot:empty {
    display: none;
}

.ldpp-row-btn,
.ldpp-icon-btn {
    --ldpp-flat-rest: var(--ldpp-flat-icon);
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    margin: 0;
    border: 1px solid transparent;
    border-radius: var(--ldpp-btn-radius);
    background: transparent;
    color: var(--ldpp-btn-tone, var(--ldpp-flat-rest));
    line-height: 1;
    cursor: pointer;
    transition: var(--d-button-transition, none);
}

.ldpp-row-btn {
    height: 1.75rem;
    min-width: 1.75rem;
    padding: 0 0.4rem;
    font-size: var(--ldpp-font-sm);
}

@media (hover: hover) {
    .ldpp-row-btn:hover,
    .ldpp-icon-btn:hover {
        background: var(--ldpp-flat-bg-hover);
        color: var(--ldpp-btn-tone, var(--ldpp-flat-icon-hover));
    }
}

.ldpp-row-btn:focus-visible,
.ldpp-icon-btn:focus-visible {
    outline: 2px solid var(--ldpp-accent);
    outline-offset: -2px;
    background: var(--ldpp-flat-bg-focus);
    color: var(--ldpp-btn-tone, var(--ldpp-flat-icon-hover));
}

.ldpp-row-btn:active:not(:disabled),
.ldpp-icon-btn:active:not(:disabled) {
    background-color: var(--ldpp-flat-bg-hover);
    background-image: var(--ldpp-press);
}

.ldpp-row-btn.is-active,
.ldpp-icon-btn[aria-pressed="true"] {
    --ldpp-btn-tone: var(--tertiary, var(--ldpp-accent));
}

.ldpp-row-btn:disabled {
    cursor: progress;
    opacity: 0.8;
}

.ldpp-feedback-svg {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 55%;
    max-width: 20px;
    height: auto;
    aspect-ratio: 1;
    opacity: 0;
    pointer-events: none;
}

.ldpp-feedback-svg path {
    fill: none;
    stroke: var(--success, var(--ldpp-success));
    stroke-width: 4;
    stroke-dasharray: 100;
    stroke-dashoffset: 100;
    animation: ldpp-feedback-draw 1s forwards;
}

.ldpp-feedback-alert {
    position: absolute;
    bottom: calc(100% + 0.15rem);
    left: 50%;
    z-index: 101;
    padding: 0.1rem 0.4rem;
    transform: translateX(-50%);
    font-size: var(--font-down-2, 0.75em);
    font-weight: normal;
    line-height: 1.4;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
}

.ldpp-feedback-alert.is-success {
    color: var(--success, var(--ldpp-success));
}

.ldpp-feedback-alert.is-fail {
    color: var(--danger, var(--ldpp-danger));
}

.is-feedback-transition > :is(.ldpp-feedback-svg, .ldpp-feedback-alert) {
    transition: opacity 0.25s, color 0.25s;
}

.is-feedback-active > :is(.ldpp-feedback-svg, .ldpp-feedback-alert) {
    opacity: 1;
}

@keyframes ldpp-feedback-draw {
    to {
        stroke-dashoffset: 0;
    }
}

.ldpp-hover-only {
    opacity: 0;
}

tr.topic-list-item:hover .ldpp-hover-only,
tr.topic-list-item:focus-within .ldpp-hover-only,
.ldpp-hover-only:focus-visible {
    opacity: 1;
}

@media (hover: none), (pointer: coarse) {
    .ldpp-hover-only {
        opacity: 1;
    }
}

tr.ldpp-panel-row > td {
    padding: 0 0.5rem 0.75rem !important;
    border-top: 0 !important;
}

.ldpp-panel {
    contain: content;
}

.ldpp-btn {
    --ldpp-btn-bg: var(--d-button-default-bg-color, var(--primary-low, #e9e9e9));
    --ldpp-btn-fg: var(--d-button-default-text-color, var(--primary, #222));
    --ldpp-btn-icon: var(--d-button-default-icon-color, var(--primary-high, #4d4d4d));
    --ldpp-btn-border: var(--d-button-default-border, var(--d-button-border, 1px solid transparent));
    --ldpp-btn-bg-hover: var(--d-button-default-bg-color--hover, var(--primary-medium, #888));
    --ldpp-btn-fg-hover: var(--d-button-default-text-color--hover, var(--secondary, #fff));
    --ldpp-btn-icon-hover: var(--d-button-default-icon-color--hover, var(--primary-low, #e9e9e9));
    --ldpp-btn-border-hover: var(--d-button-default-border--hover, var(--ldpp-btn-border));
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35em;
    min-height: 2.1rem;
    margin: 0;
    padding: 0.5em 0.65em;
    border: var(--ldpp-btn-border);
    border-radius: var(--ldpp-btn-radius);
    background: var(--ldpp-btn-bg);
    color: var(--ldpp-btn-fg);
    font-size: var(--ldpp-font-sm);
    font-weight: normal;
    line-height: 1.2;
    cursor: pointer;
    transition: var(--d-button-transition, none);
}

.ldpp-btn .ldpp-icon {
    color: var(--ldpp-btn-icon);
}

@media (hover: hover) {
    .ldpp-btn:hover:not(:disabled) {
        border: var(--ldpp-btn-border-hover);
        background: var(--ldpp-btn-bg-hover);
        color: var(--ldpp-btn-fg-hover);
    }

    .ldpp-btn:hover:not(:disabled) .ldpp-icon {
        color: var(--ldpp-btn-icon-hover);
    }
}

.ldpp-btn:focus-visible {
    outline: 2px solid var(--ldpp-accent);
    outline-offset: 1px;
}

.ldpp-btn:active:not(:disabled) {
    background-color: var(--ldpp-btn-bg-hover);
    background-image: var(--ldpp-press);
    color: var(--ldpp-btn-fg-hover);
}

.ldpp-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.ldpp-btn-small {
    min-height: 1.8rem;
    padding: 0.25em 0.6em;
}

.ldpp-btn-primary {
    --ldpp-btn-bg: var(--d-button-primary-bg-color, var(--tertiary, #08c));
    --ldpp-btn-fg: var(--d-button-primary-text-color, var(--secondary, #fff));
    --ldpp-btn-icon: var(--d-button-primary-icon-color, var(--secondary, #fff));
    --ldpp-btn-border: var(--d-button-primary-border, 1px solid transparent);
    --ldpp-btn-bg-hover: var(--d-button-primary-bg-color--hover, var(--tertiary-hover, #06a));
    --ldpp-btn-fg-hover: var(--d-button-primary-text-color--hover, var(--secondary, #fff));
    --ldpp-btn-icon-hover: var(--d-button-primary-icon-color--hover, var(--secondary, #fff));
    --ldpp-btn-border-hover: var(--d-button-primary-border--hover, 1px solid transparent);
}

.ldpp-btn-delete {
    --ldpp-btn-bg-hover: var(--d-button-danger-bg-color, var(--danger, #e45735));
    --ldpp-btn-fg-hover: var(--d-button-danger-text-color, var(--secondary, #fff));
    --ldpp-btn-icon-hover: var(--d-button-danger-icon-color, var(--secondary, #fff));
    --ldpp-btn-border-hover: var(--d-button-danger-border, 1px solid transparent);
}

.ldpp-btn-danger {
    --ldpp-btn-bg: var(--d-button-danger-bg-color, var(--danger, #e45735));
    --ldpp-btn-fg: var(--d-button-danger-text-color, var(--secondary, #fff));
    --ldpp-btn-icon: var(--d-button-danger-icon-color, var(--secondary, #fff));
    --ldpp-btn-border: var(--d-button-danger-border, 1px solid transparent);
    --ldpp-btn-bg-hover: var(--d-button-danger-bg-color--hover, var(--danger-hover, #b33));
    --ldpp-btn-fg-hover: var(--d-button-danger-text-color--hover, var(--secondary, #fff));
    --ldpp-btn-icon-hover: var(--d-button-danger-icon-color--hover, var(--secondary, #fff));
    --ldpp-btn-border-hover: var(--d-button-danger-border--hover, 1px solid transparent);
}

.ldpp-btn-ghost {
    --ldpp-btn-bg: transparent;
    --ldpp-btn-fg: var(--ldpp-flat-text);
    --ldpp-btn-icon: var(--ldpp-flat-icon);
    --ldpp-btn-border: 1px solid transparent;
    --ldpp-btn-bg-hover: var(--ldpp-flat-bg-hover);
    --ldpp-btn-fg-hover: var(--ldpp-flat-text-hover);
    --ldpp-btn-icon-hover: var(--ldpp-flat-icon-hover);
    --ldpp-btn-border-hover: 1px solid transparent;
}

.ldpp-icon-btn {
    width: 2rem;
    height: 2rem;
    padding: 0;
}

.ldpp-icon-btn.ldpp-row-btn {
    width: 1.75rem;
    min-width: 1.75rem;
    height: 1.75rem;
}

/*
 * Every LD++ scroll area (sidebar, settings, dialogs, card lists, panels, text boxes) gets a thin scrollbar on a
 * transparent track, as the old summary script had: the classic scrollbar's grey track down the whole panel looked
 * heavy. The thumb is Discourse's own mid grey. :where() keeps it overridable.
 */
:where([data-ldpp], [data-ldpp] *, .ldpp-panel-row *) {
    scrollbar-width: thin;
    scrollbar-color: var(--primary-low-mid, rgb(127 127 127 / 50%)) transparent;
}

.ldpp-input {
    box-sizing: border-box;
    width: 100%;
    min-height: 2.1rem;
    margin: 0;
    padding: 0.35rem 0.55rem;
    border: 1px solid var(--ldpp-line);
    border-radius: 6px;
    background: var(--ldpp-bg);
    color: var(--ldpp-fg);
    font: inherit;
    font-size: var(--ldpp-font-sm);
}

/*
 * linux.do (Discourse) styles \`input[type=text|search|number|password…]\` at specificity (0,1,1), above \`.ldpp-input\`:
 * 16px text, 8px × 10.4px padding and a 9px bottom margin. Text inputs came out 38px tall next to 34px selects, used
 * a bigger font than the selects beside them and stretched the \uD83D\uDC41 row. Repeating the class puts LD++'s own box model
 * back on every input type; selects and textareas are only styled by bare element selectors, which \`.ldpp-input\` beats.
 */
input.ldpp-input.ldpp-input {
    margin: 0;
    padding: 0.35rem 0.55rem;
    border: 1px solid var(--ldpp-line);
    border-radius: 6px;
    background: var(--ldpp-bg);
    color: var(--ldpp-fg);
    font-size: var(--ldpp-font-sm);
}

/* iOS zooms the page into any focused field under 16px, which is why Discourse keeps inputs at 16px on phones. */
@media (pointer: coarse) {
    input.ldpp-input.ldpp-input,
    select.ldpp-input.ldpp-input,
    textarea.ldpp-input.ldpp-input {
        font-size: 16px;
    }
}

textarea.ldpp-input {
    resize: vertical;
    line-height: 1.5;
}

.ldpp-input:focus,
input.ldpp-input.ldpp-input:focus {
    border-color: var(--ldpp-accent);
    outline: none;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--ldpp-accent) 35%, transparent);
}

.ldpp-input.ldpp-input.is-invalid {
    border-color: var(--ldpp-danger);
}

.ldpp-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.ldpp-number {
    width: 6.5rem;
}

.ldpp-number-wrap {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
}

.ldpp-select {
    width: auto;
    min-width: 10rem;
    max-width: 100%;
}

/*
 * A native select (appearance: auto) insets its text a further 4px past the padding (Chromium's internal menu-list
 * padding), so 「当前编辑」 read 4px right of 「名称」 below it although both boxes start at the same x. Without the
 * native look the select uses exactly the inputs' padding; the arrow is drawn instead, as Void++'s select trigger
 * draws its chevron: two 45° strokes in the text colour, so it follows the light and dark themes.
 */
select.ldpp-input {
    appearance: none;
    padding-right: calc(0.55rem + 8px + 0.5rem);
    background-image:
        linear-gradient(45deg, transparent calc(50% - 0.6px), var(--ldpp-select-arrow) calc(50% - 0.6px) calc(50% + 0.6px), transparent calc(50% + 0.6px)),
        linear-gradient(-45deg, transparent calc(50% - 0.6px), var(--ldpp-select-arrow) calc(50% - 0.6px) calc(50% + 0.6px), transparent calc(50% + 0.6px));
    background-position: right calc(0.55rem + 4px) center, right 0.55rem center;
    background-size: 4px 4px;
    background-repeat: no-repeat;
    --ldpp-select-arrow: color-mix(in srgb, currentColor 80%, transparent);
}

.ldpp-unit,
.ldpp-muted {
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
}

.ldpp-secret {
    display: flex;
    align-items: stretch;
    min-width: 0;
}

.ldpp-secret .ldpp-input {
    flex: 1 1 auto;
    min-width: 0;
}

.ldpp-secret .ldpp-input.ldpp-input {
    border-radius: 6px 0 0 6px;
}

.ldpp-secret-toggle {
    display: inline-flex;
    align-items: center;
    padding: 0 0.6rem;
    border: 1px solid var(--ldpp-line);
    border-left: 0;
    border-radius: 0 6px 6px 0;
    background: var(--ldpp-soft);
    color: var(--ldpp-muted);
    cursor: pointer;
}

/* The switch and checkbox rows are <label>s, which Discourse gives \`margin-bottom: 5px\`; on a centred row that lifted
   the switch 2.5px above its text. */
.ldpp-switch {
    position: relative;
    display: inline-flex;
    flex: none;
    margin-block: 0;
    width: 2.4rem;
    height: 1.35rem;
    cursor: pointer;
}

.ldpp-switch input[type="checkbox"] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
}

.ldpp-switch-track {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 999px;
    background: var(--ldpp-line);
    transition: background-color 0.15s ease;
}

.ldpp-switch-track::after {
    content: "";
    position: absolute;
    top: 0.15rem;
    left: 0.15rem;
    width: 1.05rem;
    height: 1.05rem;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgb(0 0 0 / 30%);
    transition: transform 0.15s ease;
}

.ldpp-switch input:checked + .ldpp-switch-track {
    background: var(--ldpp-accent);
}

.ldpp-switch input:checked + .ldpp-switch-track::after {
    transform: translateX(1.05rem);
}

.ldpp-switch input:focus-visible + .ldpp-switch-track {
    outline: 2px solid var(--ldpp-accent);
    outline-offset: 2px;
}

.ldpp-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--ldpp-line);
}

.ldpp-field:last-child {
    border-bottom: 0;
}

.ldpp-field-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}

.ldpp-field-head > :last-child {
    flex: 0 1 auto;
    max-width: 60%;
}

/*
 * Every input-type control - text, secret, select, number, slider or an inline group - takes the same column right
 * of its label and fills it, so left (and right) edges line up down a form and inside each column of a split form.
 * Before, only text boxes had the column; selects, numbers and groups sat right-aligned at their own widths and each
 * started at a different x. The column never shrinks (a long label wraps instead); switches keep their own size at
 * the right edge.
 */
.ldpp-field-head > :is(input, select, .ldpp-secret, .ldpp-field-wide, .ldpp-field-control, .ldpp-number-wrap, .ldpp-slider-wrap, .ldpp-inline-controls, .ldpp-theme-var-control) {
    flex: 0 0 62%;
    max-width: 62%;
    min-width: 0;
}

.ldpp-field-head > :is(.ldpp-number-wrap, .ldpp-slider-wrap) {
    display: flex;
}

.ldpp-field-head > .ldpp-number-wrap > .ldpp-number,
.ldpp-field-head > .ldpp-slider-wrap > .ldpp-slider {
    flex: 1 1 auto;
    width: auto;
    min-width: 0;
}

.ldpp-field-head > select.ldpp-select {
    min-width: 0;
}

/* An inline group (「失败重试」: number 次 间隔 number 秒) fills the column too: its two numbers share the width that
   is left, so the group ends at the same right edge as the inputs above it instead of 140px short. */
.ldpp-field-head > .ldpp-inline-controls {
    display: flex;
    flex-wrap: nowrap;
}

.ldpp-field-head > .ldpp-inline-controls > .ldpp-number-wrap {
    display: flex;
    flex: 1 1 0;
    min-width: 0;
}

.ldpp-field-head > .ldpp-inline-controls > .ldpp-number-wrap > .ldpp-number {
    flex: 1 1 auto;
    width: auto;
    min-width: 0;
}

.ldpp-field-wide > .ldpp-input,
.ldpp-field-wide > .ldpp-secret {
    width: 100%;
}

.ldpp-inline-controls {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
}

/* Flex, so a label's ⓘ (24px, taller than the text line) is centred with the text instead of sitting on its
   baseline and pushing the text 3px off the control beside it. */
.ldpp-field-label,
.ldpp-section-title {
    display: flex;
    align-items: center;
}

.ldpp-field-label {
    color: var(--ldpp-fg);
    font-weight: 600;
}

.ldpp-section {
    margin: 0 0 1rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--ldpp-line);
    border-radius: var(--ldpp-radius);
    background: var(--ldpp-bg);
}

.ldpp-section-title {
    margin: 0 0 0.25rem;
    font-size: 1em;
}

.ldpp-hint {
    margin: 0.35rem 0;
    overflow-wrap: anywhere;
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
    line-height: 1.5;
}

.ldpp-hint-warning {
    color: var(--ldpp-warning);
}

.ldpp-hint-error {
    color: var(--danger, var(--ldpp-danger));
}

.ldpp-hint-success {
    color: var(--success, var(--ldpp-success));
}

/* Floating page-level toggle (「已屏蔽 N」, search filter): icon + count in a pill, as in the old blocker script. */
.ldpp-float-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    margin: 0;
    padding: 0 10px;
    border: var(--d-button-default-border, 1px solid var(--primary-low, #e9e9e9));
    border-radius: 12px;
    background: var(--secondary, #fff);
    color: var(--primary, #222);
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
    box-shadow: 0 2px 6px rgb(0 0 0 / 25%);
    cursor: pointer;
    user-select: none;
}

@media (hover: hover) {
    .ldpp-float-pill:hover {
        background: var(--ldpp-flat-bg-hover);
    }
}

.ldpp-float-pill:active {
    background-image: var(--ldpp-press);
}

.ldpp-float-pill:focus-visible {
    outline: 2px solid var(--ldpp-accent);
    outline-offset: 2px;
}

.ldpp-float-count {
    min-width: 16px;
    text-align: center;
}

.ldpp-float-count[hidden] {
    display: none;
}

.ldpp-float-pill.is-revealing {
    color: var(--primary-medium, #888);
    box-shadow: none;
}

.ldpp-float-pill.is-revealing .ldpp-icon {
    opacity: 0.5;
}

@media (max-width: 768px) {
    .ldpp-float-pill {
        height: 34px;
        padding: 0 8px;
        border-radius: 10px;
    }
}

/* Sub-tabs: one of a few related blocks at a time (关键词 / 正则, 总结方法 / 输出格式, 判断 / 改写提示词). */
.ldpp-subtabs {
    display: flex;
    gap: 0.125rem;
    margin-bottom: 0.75rem;
    border-bottom: 1px solid var(--ldpp-line);
}

.ldpp-subtab {
    position: relative;
    margin: 0;
    padding: 0.35rem 0.65rem;
    border: 0;
    border-radius: var(--ldpp-btn-radius);
    background: transparent;
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
    cursor: pointer;
}

@media (hover: hover) {
    .ldpp-subtab:hover {
        background: var(--ldpp-flat-bg-hover);
        color: var(--ldpp-fg);
    }
}

.ldpp-subtab.is-active {
    color: var(--ldpp-fg);
}

.ldpp-subtab.is-active::after {
    content: "";
    position: absolute;
    inset-inline: 0.5rem;
    bottom: -1px;
    height: 2px;
    border-radius: 1px;
    background: var(--ldpp-fg);
}

.ldpp-infotip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    margin: 0 0 0 0.2rem;
    padding: 0;
    border: none;
    border-radius: var(--ldpp-btn-radius);
    background: transparent;
    color: var(--ldpp-flat-icon);
    font-size: inherit;
    line-height: 1;
    vertical-align: middle;
    cursor: pointer;
}

@media (hover: hover) {
    .ldpp-infotip:hover {
        background: var(--ldpp-flat-bg-hover);
        color: var(--ldpp-flat-icon-hover);
    }
}

.ldpp-infotip:focus-visible {
    outline: 2px solid var(--ldpp-accent);
    outline-offset: -2px;
}

.ldpp-infotip[aria-expanded="true"] {
    color: var(--tertiary, var(--ldpp-accent));
}

.ldpp-infotip.is-warning {
    color: var(--ldpp-warning);
}

.ldpp-infotip-pop {
    position: fixed;
    z-index: 10030;
    box-sizing: border-box;
    max-width: min(20rem, calc(100vw - 16px));
    padding: 0.5rem 0.65rem;
    border: 1px solid var(--primary-low, var(--ldpp-line));
    border-radius: var(--d-border-radius, 6px);
    background: var(--secondary, var(--ldpp-bg));
    color: var(--primary, var(--ldpp-fg));
    box-shadow: var(--shadow-menu-panel, var(--ldpp-shadow));
    font-size: var(--ldpp-font-sm);
    font-weight: 400;
    line-height: 1.5;
}

/* No scrollbar of its own: error details sit in the sidebar, a list panel or the settings pane, which already scroll. */
.ldpp-pre {
    margin: 0;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.8rem;
}

.ldpp-row-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin: 0.4rem 0;
}

.ldpp-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.75rem;
}

.ldpp-tab {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.8rem;
    border: 0;
    border-radius: 999px;
    background: var(--ldpp-soft);
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
    cursor: pointer;
}

@media (hover: hover) {
    .ldpp-tab:not(.is-active):hover {
        background: var(--ldpp-flat-bg-hover);
        color: var(--ldpp-flat-text-hover);
    }
}

.ldpp-tab:active:not(.is-active) {
    background-color: var(--ldpp-flat-bg-hover);
    background-image: var(--ldpp-press);
}

.ldpp-tab.is-active {
    background: var(--ldpp-accent);
    color: var(--secondary, #fff);
}

.ldpp-tabs-vertical {
    flex-direction: column;
    flex-wrap: nowrap;
    margin: 0;
}

.ldpp-tabs-vertical .ldpp-tab {
    justify-content: flex-start;
    border-radius: var(--ldpp-btn-radius);
    background: transparent;
    font-size: inherit;
}

.ldpp-tabs-vertical .ldpp-tab.is-active {
    background: var(--d-selected, var(--ldpp-accent-soft));
    color: var(--d-selected-text-color, var(--ldpp-fg));
}

.ldpp-dialog-overlay {
    position: fixed;
    inset: 0;
    z-index: 10010;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: rgb(0 0 0 / 50%);
}

/* A dialog opened from another dialog (plugin settings, confirmations) does not darken the page twice. */
.ldpp-dialog-overlay.is-nested {
    background: transparent;
}

/* See \`covers\` in Dialog.ts: the large dialog underneath a same-size one is hidden, not shown around its edges. */
.ldpp-dialog-overlay.is-covered > .ldpp-dialog {
    visibility: hidden;
}

.ldpp-dialog {
    display: flex;
    flex-direction: column;
    width: min(32rem, 100%);
    max-height: min(85vh, 100%);
    border-radius: 12px;
    background: var(--ldpp-bg);
    color: var(--ldpp-fg);
    box-shadow: var(--ldpp-shadow);
    outline: none;
    contain: content;
}

.ldpp-dialog-small {
    width: min(26rem, 100%);
}

.ldpp-dialog-large {
    width: min(58rem, 100%);
    height: min(80vh, 100%);
}

.ldpp-dialog-header {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 0.75rem 0.75rem 1.25rem;
    border-bottom: 1px solid var(--ldpp-line);
}

/* ‹ back + title; the button's padding is pulled into the header gutter so its chevron lines up with the content. */
.ldpp-dialog-heading {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
    margin-inline-start: -0.5rem;
}

.ldpp-dialog-title {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0;
    font-size: 1.1em;
}

.ldpp-dialog-title > .ldpp-icon:first-child {
    flex: none;
    color: var(--primary-high, var(--ldpp-muted));
}

.ldpp-dialog.is-danger .ldpp-dialog-title > .ldpp-icon:first-child {
    color: var(--danger, var(--ldpp-danger));
}

.ldpp-dialog-title > .ldpp-infotip {
    margin: 0;
}

/* Secondary actions (关闭 / 取消) use Discourse's stock grey default button, not linux.do's outlined variant. */
.ldpp-dialog-footer .ldpp-btn-default {
    --ldpp-btn-bg: var(--primary-low, #e9e9e9);
    --ldpp-btn-fg: var(--primary, #222);
    --ldpp-btn-icon: var(--primary-high, #4d4d4d);
    --ldpp-btn-border: 1px solid transparent;
    --ldpp-btn-bg-hover: var(--primary-medium, #888);
    --ldpp-btn-fg-hover: var(--secondary, #fff);
    --ldpp-btn-icon-hover: var(--secondary, #fff);
    --ldpp-btn-border-hover: 1px solid transparent;
}

.ldpp-dialog-body {
    flex: 1 1 auto;
    min-height: 0;
    padding: 1rem 1.25rem;
    overflow: auto;
    overscroll-behavior: contain;
}

.ldpp-dialog-footer {
    display: flex;
    flex: none;
    justify-content: flex-end;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border-top: 1px solid var(--ldpp-line);
}

.ldpp-confirm-text {
    line-height: 1.6;
}

.ldpp-toasts {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 10020;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: min(22rem, calc(100vw - 2rem));
    max-height: 80vh;
    overflow: hidden auto;
    pointer-events: none;
}

.ldpp-toast {
    position: relative;
    display: flex;
    gap: 0.6rem;
    padding: 0.7rem 2.2rem 0.7rem 0.85rem;
    border: 1px solid var(--ldpp-line);
    border-radius: 10px;
    background: var(--ldpp-bg);
    color: var(--ldpp-fg);
    box-shadow: var(--ldpp-shadow);
    opacity: 0;
    transform: translateY(0.5rem);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: auto;
}

.ldpp-toast.is-shown {
    opacity: 1;
    transform: none;
}

.ldpp-toast.is-clickable {
    cursor: pointer;
}

tr.topic-list-item.ldpp-flash > td {
    animation: ldpp-flash 1.6s ease;
}

@keyframes ldpp-flash {
    0%,
    60% {
        background-color: var(--ldpp-accent-soft);
    }
}

.ldpp-toast-dot {
    flex: none;
    width: 0.55rem;
    height: 0.55rem;
    margin-top: 0.4rem;
    border-radius: 50%;
    background: var(--ldpp-accent);
}

.ldpp-toast-success .ldpp-toast-dot {
    background: var(--ldpp-success);
}

.ldpp-toast-warning .ldpp-toast-dot {
    background: var(--ldpp-warning);
}

.ldpp-toast-error .ldpp-toast-dot {
    background: var(--ldpp-danger);
}

.ldpp-toast-loading .ldpp-toast-dot {
    border: 2px solid var(--ldpp-accent);
    border-top-color: transparent;
    background: transparent;
    animation: ldpp-spin 0.8s linear infinite;
}

.ldpp-toast-main {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
    line-height: 1.45;
}

.ldpp-toast-text {
    overflow-wrap: anywhere;
}

.ldpp-toast-topic {
    overflow: hidden;
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
    white-space: nowrap;
    text-overflow: ellipsis;
}

.ldpp-toast-close {
    position: absolute;
    top: 0.35rem;
    right: 0.35rem;
    width: 1.5rem;
    height: 1.5rem;
}

.ldpp-spinner {
    /* Fixed size in any flex row: a long status beside it would otherwise squeeze the circle into a thin pill. */
    flex: none;
    display: inline-block;
    width: 0.9rem;
    height: 0.9rem;
    border: 2px solid var(--ldpp-accent);
    border-top-color: transparent;
    border-radius: 50%;
    animation: ldpp-spin 0.8s linear infinite;
}

@keyframes ldpp-spin {
    to {
        transform: rotate(360deg);
    }
}

.ldpp-content {
    line-height: 1.65;
    overflow-wrap: anywhere;
}

.ldpp-content > :first-child {
    margin-top: 0;
}

.ldpp-content > :last-child {
    margin-bottom: 0;
}

.ldpp-content pre {
    overflow: auto;
}

.ldpp-error-box {
    padding: 0.6rem 0.75rem;
    /* Error messages carry unbroken URLs; wrap them instead of scrolling the pane sideways. */
    overflow-wrap: anywhere;
    border-radius: var(--d-border-radius, 6px);
    background: var(--danger-low, color-mix(in srgb, var(--ldpp-danger) 12%, transparent));
}

.ldpp-error-box summary {
    cursor: pointer;
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
}

.ldpp-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
}

.ldpp-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.15rem 0.2rem 0.15rem 0.55rem;
    border-radius: 999px;
    background: var(--ldpp-accent-soft);
    font-size: var(--ldpp-font-sm);
}

.ldpp-chip-remove {
    display: inline-flex;
    padding: 0.15rem;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--ldpp-flat-icon);
    cursor: pointer;
}

@media (hover: hover) {
    .ldpp-chip-remove:hover {
        background: var(--ldpp-flat-bg-hover);
        color: var(--ldpp-flat-icon-hover);
    }
}

.ldpp-check {
    display: inline-flex;
    align-items: center;
    margin: 0;
    gap: 0.35rem;
    cursor: pointer;
}

/* Discourse's \`input[type="checkbox"]\` margin (2.7px top, 6.9px right) sat the box 2px below its text. */
.ldpp-check input[type="checkbox"] {
    flex: none;
    margin: 0;
}

.ldpp-check-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
}

html.ldpp-dialog-open {
    overflow: hidden;
}
`);

  // src/utils/Logger.ts
  var CAP = "color:#111;font-weight:700;padding:1px 6px;border-radius:6px 0 0 6px;background:linear-gradient(135deg,#f9d77e,#f2a65a);";
  var BODY = "background:#1f2329;font-weight:600;padding:1px 6px;border-radius:0 6px 6px 0;";

  class Logger {
    name;
    color;
    constructor(name, color = "#d4dbe3") {
      this.name = name;
      this.color = color;
    }
    emit(level, args) {
      const sink = level === "error" ? console.error : level === "warn" ? console.warn : level === "debug" ? console.debug : console.log;
      if (typeof window === "undefined") {
        sink(`[LD++ ${this.name}]`, ...args);
        return;
      }
      sink(`%cLD++%c${this.name}%c`, CAP, `${BODY}color:${this.color};`, "", ...args);
    }
    log(...args) {
      this.emit("log", args);
    }
    info(...args) {
      this.emit("info", args);
    }
    warn(...args) {
      this.emit("warn", args);
    }
    error(...args) {
      this.emit("error", args);
    }
    debug(...args) {
      if (false)
        ;
    }
  }

  // src/utils/gm.ts
  var logger = new Logger("GM");
  var LS_PREFIX = "ldpp-gm:";
  var hasGM = (name) => typeof globalThis[name] === "function";
  function gmGet(key, fallback) {
    try {
      if (hasGM("GM_getValue"))
        return GM_getValue(key, fallback) ?? fallback;
      const raw = localStorage.getItem(LS_PREFIX + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (error) {
      logger.warn(`读取 ${key} 失败`, error);
      return fallback;
    }
  }
  function gmSet(key, value) {
    try {
      if (hasGM("GM_setValue"))
        GM_setValue(key, value);
      else
        localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
    } catch (error) {
      logger.error(`写入 ${key} 失败`, error);
    }
  }
  function gmDelete(key) {
    try {
      if (hasGM("GM_deleteValue"))
        GM_deleteValue(key);
      else
        localStorage.removeItem(LS_PREFIX + key);
    } catch (error) {
      logger.warn(`删除 ${key} 失败`, error);
    }
  }
  function gmOnRemoteChange(key, onChange) {
    if (!hasGM("GM_addValueChangeListener"))
      return;
    GM_addValueChangeListener(key, (_name, _old, value, remote) => {
      if (remote)
        onChange(value);
    });
  }
  function gmMenu(name, fn) {
    if (hasGM("GM_registerMenuCommand"))
      GM_registerMenuCommand(name, fn);
  }

  // src/utils/guards.ts
  function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function asString(value) {
    return value == null ? "" : String(value).trim();
  }
  function asStringArray(value) {
    if (!Array.isArray(value))
      return [];
    return value.map(asString).filter(Boolean);
  }
  function asInt(value, fallback, min, max) {
    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed))
      return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  // src/api/Events.ts
  var logger2 = new Logger("Events");
  var listeners = new Map;
  function subscribe(event, handler) {
    const set = mapGetOrCreate(listeners, event, () => new Set);
    set.add(handler);
    return () => {
      set.delete(handler);
      if (!set.size)
        listeners.delete(event);
    };
  }
  function dispatch(event, data) {
    const set = listeners.get(event);
    if (!set)
      return;
    for (const handler of Array.from(set)) {
      try {
        handler(data);
      } catch (error) {
        logger2.error(`事件 ${event} 处理出错`, error);
      }
    }
  }

  // node_modules/marked/lib/marked.esm.js
  function _getDefaults() {
    return {
      async: false,
      breaks: false,
      extensions: null,
      gfm: true,
      hooks: null,
      pedantic: false,
      renderer: null,
      silent: false,
      tokenizer: null,
      walkTokens: null
    };
  }
  var _defaults = _getDefaults();
  function changeDefaults(newDefaults) {
    _defaults = newDefaults;
  }
  var escapeTest = /[&<>"']/;
  var escapeReplace = new RegExp(escapeTest.source, "g");
  var escapeTestNoEncode = /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/;
  var escapeReplaceNoEncode = new RegExp(escapeTestNoEncode.source, "g");
  var escapeReplacements = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  var getEscapeReplacement = (ch) => escapeReplacements[ch];
  function escape$1(html, encode) {
    if (encode) {
      if (escapeTest.test(html)) {
        return html.replace(escapeReplace, getEscapeReplacement);
      }
    } else {
      if (escapeTestNoEncode.test(html)) {
        return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
      }
    }
    return html;
  }
  var caret = /(^|[^\[])\^/g;
  function edit(regex, opt) {
    let source = typeof regex === "string" ? regex : regex.source;
    opt = opt || "";
    const obj = {
      replace: (name, val) => {
        let valSource = typeof val === "string" ? val : val.source;
        valSource = valSource.replace(caret, "$1");
        source = source.replace(name, valSource);
        return obj;
      },
      getRegex: () => {
        return new RegExp(source, opt);
      }
    };
    return obj;
  }
  function cleanUrl(href) {
    try {
      href = encodeURI(href).replace(/%25/g, "%");
    } catch {
      return null;
    }
    return href;
  }
  var noopTest = { exec: () => null };
  function splitCells(tableRow, count) {
    const row = tableRow.replace(/\|/g, (match, offset, str) => {
      let escaped = false;
      let curr = offset;
      while (--curr >= 0 && str[curr] === "\\")
        escaped = !escaped;
      if (escaped) {
        return "|";
      } else {
        return " |";
      }
    }), cells = row.split(/ \|/);
    let i = 0;
    if (!cells[0].trim()) {
      cells.shift();
    }
    if (cells.length > 0 && !cells[cells.length - 1].trim()) {
      cells.pop();
    }
    if (count) {
      if (cells.length > count) {
        cells.splice(count);
      } else {
        while (cells.length < count)
          cells.push("");
      }
    }
    for (;i < cells.length; i++) {
      cells[i] = cells[i].trim().replace(/\\\|/g, "|");
    }
    return cells;
  }
  function rtrim(str, c, invert) {
    const l = str.length;
    if (l === 0) {
      return "";
    }
    let suffLen = 0;
    while (suffLen < l) {
      const currChar = str.charAt(l - suffLen - 1);
      if (currChar === c && !invert) {
        suffLen++;
      } else if (currChar !== c && invert) {
        suffLen++;
      } else {
        break;
      }
    }
    return str.slice(0, l - suffLen);
  }
  function findClosingBracket(str, b) {
    if (str.indexOf(b[1]) === -1) {
      return -1;
    }
    let level = 0;
    for (let i = 0;i < str.length; i++) {
      if (str[i] === "\\") {
        i++;
      } else if (str[i] === b[0]) {
        level++;
      } else if (str[i] === b[1]) {
        level--;
        if (level < 0) {
          return i;
        }
      }
    }
    return -1;
  }
  function outputLink(cap, link, raw, lexer) {
    const href = link.href;
    const title = link.title ? escape$1(link.title) : null;
    const text = cap[1].replace(/\\([\[\]])/g, "$1");
    if (cap[0].charAt(0) !== "!") {
      lexer.state.inLink = true;
      const token = {
        type: "link",
        raw,
        href,
        title,
        text,
        tokens: lexer.inlineTokens(text)
      };
      lexer.state.inLink = false;
      return token;
    }
    return {
      type: "image",
      raw,
      href,
      title,
      text: escape$1(text)
    };
  }
  function indentCodeCompensation(raw, text) {
    const matchIndentToCode = raw.match(/^(\s+)(?:```)/);
    if (matchIndentToCode === null) {
      return text;
    }
    const indentToCode = matchIndentToCode[1];
    return text.split(`
`).map((node) => {
      const matchIndentInNode = node.match(/^\s+/);
      if (matchIndentInNode === null) {
        return node;
      }
      const [indentInNode] = matchIndentInNode;
      if (indentInNode.length >= indentToCode.length) {
        return node.slice(indentToCode.length);
      }
      return node;
    }).join(`
`);
  }

  class _Tokenizer {
    options;
    rules;
    lexer;
    constructor(options) {
      this.options = options || _defaults;
    }
    space(src) {
      const cap = this.rules.block.newline.exec(src);
      if (cap && cap[0].length > 0) {
        return {
          type: "space",
          raw: cap[0]
        };
      }
    }
    code(src) {
      const cap = this.rules.block.code.exec(src);
      if (cap) {
        const text = cap[0].replace(/^(?: {1,4}| {0,3}\t)/gm, "");
        return {
          type: "code",
          raw: cap[0],
          codeBlockStyle: "indented",
          text: !this.options.pedantic ? rtrim(text, `
`) : text
        };
      }
    }
    fences(src) {
      const cap = this.rules.block.fences.exec(src);
      if (cap) {
        const raw = cap[0];
        const text = indentCodeCompensation(raw, cap[3] || "");
        return {
          type: "code",
          raw,
          lang: cap[2] ? cap[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : cap[2],
          text
        };
      }
    }
    heading(src) {
      const cap = this.rules.block.heading.exec(src);
      if (cap) {
        let text = cap[2].trim();
        if (/#$/.test(text)) {
          const trimmed = rtrim(text, "#");
          if (this.options.pedantic) {
            text = trimmed.trim();
          } else if (!trimmed || / $/.test(trimmed)) {
            text = trimmed.trim();
          }
        }
        return {
          type: "heading",
          raw: cap[0],
          depth: cap[1].length,
          text,
          tokens: this.lexer.inline(text)
        };
      }
    }
    hr(src) {
      const cap = this.rules.block.hr.exec(src);
      if (cap) {
        return {
          type: "hr",
          raw: rtrim(cap[0], `
`)
        };
      }
    }
    blockquote(src) {
      const cap = this.rules.block.blockquote.exec(src);
      if (cap) {
        let lines = rtrim(cap[0], `
`).split(`
`);
        let raw = "";
        let text = "";
        const tokens = [];
        while (lines.length > 0) {
          let inBlockquote = false;
          const currentLines = [];
          let i;
          for (i = 0;i < lines.length; i++) {
            if (/^ {0,3}>/.test(lines[i])) {
              currentLines.push(lines[i]);
              inBlockquote = true;
            } else if (!inBlockquote) {
              currentLines.push(lines[i]);
            } else {
              break;
            }
          }
          lines = lines.slice(i);
          const currentRaw = currentLines.join(`
`);
          const currentText = currentRaw.replace(/\n {0,3}((?:=+|-+) *)(?=\n|$)/g, `
    $1`).replace(/^ {0,3}>[ \t]?/gm, "");
          raw = raw ? `${raw}
${currentRaw}` : currentRaw;
          text = text ? `${text}
${currentText}` : currentText;
          const top = this.lexer.state.top;
          this.lexer.state.top = true;
          this.lexer.blockTokens(currentText, tokens, true);
          this.lexer.state.top = top;
          if (lines.length === 0) {
            break;
          }
          const lastToken = tokens[tokens.length - 1];
          if (lastToken?.type === "code") {
            break;
          } else if (lastToken?.type === "blockquote") {
            const oldToken = lastToken;
            const newText = oldToken.raw + `
` + lines.join(`
`);
            const newToken = this.blockquote(newText);
            tokens[tokens.length - 1] = newToken;
            raw = raw.substring(0, raw.length - oldToken.raw.length) + newToken.raw;
            text = text.substring(0, text.length - oldToken.text.length) + newToken.text;
            break;
          } else if (lastToken?.type === "list") {
            const oldToken = lastToken;
            const newText = oldToken.raw + `
` + lines.join(`
`);
            const newToken = this.list(newText);
            tokens[tokens.length - 1] = newToken;
            raw = raw.substring(0, raw.length - lastToken.raw.length) + newToken.raw;
            text = text.substring(0, text.length - oldToken.raw.length) + newToken.raw;
            lines = newText.substring(tokens[tokens.length - 1].raw.length).split(`
`);
            continue;
          }
        }
        return {
          type: "blockquote",
          raw,
          tokens,
          text
        };
      }
    }
    list(src) {
      let cap = this.rules.block.list.exec(src);
      if (cap) {
        let bull = cap[1].trim();
        const isordered = bull.length > 1;
        const list = {
          type: "list",
          raw: "",
          ordered: isordered,
          start: isordered ? +bull.slice(0, -1) : "",
          loose: false,
          items: []
        };
        bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;
        if (this.options.pedantic) {
          bull = isordered ? bull : "[*+-]";
        }
        const itemRegex = new RegExp(`^( {0,3}${bull})((?:[	 ][^\\n]*)?(?:\\n|$))`);
        let endsWithBlankLine = false;
        while (src) {
          let endEarly = false;
          let raw = "";
          let itemContents = "";
          if (!(cap = itemRegex.exec(src))) {
            break;
          }
          if (this.rules.block.hr.test(src)) {
            break;
          }
          raw = cap[0];
          src = src.substring(raw.length);
          let line = cap[2].split(`
`, 1)[0].replace(/^\t+/, (t) => " ".repeat(3 * t.length));
          let nextLine = src.split(`
`, 1)[0];
          let blankLine = !line.trim();
          let indent = 0;
          if (this.options.pedantic) {
            indent = 2;
            itemContents = line.trimStart();
          } else if (blankLine) {
            indent = cap[1].length + 1;
          } else {
            indent = cap[2].search(/[^ ]/);
            indent = indent > 4 ? 1 : indent;
            itemContents = line.slice(indent);
            indent += cap[1].length;
          }
          if (blankLine && /^[ \t]*$/.test(nextLine)) {
            raw += nextLine + `
`;
            src = src.substring(nextLine.length + 1);
            endEarly = true;
          }
          if (!endEarly) {
            const nextBulletRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`);
            const hrRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`);
            const fencesBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:\`\`\`|~~~)`);
            const headingBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}#`);
            const htmlBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}<(?:[a-z].*>|!--)`, "i");
            while (src) {
              const rawLine = src.split(`
`, 1)[0];
              let nextLineWithoutTabs;
              nextLine = rawLine;
              if (this.options.pedantic) {
                nextLine = nextLine.replace(/^ {1,4}(?=( {4})*[^ ])/g, "  ");
                nextLineWithoutTabs = nextLine;
              } else {
                nextLineWithoutTabs = nextLine.replace(/\t/g, "    ");
              }
              if (fencesBeginRegex.test(nextLine)) {
                break;
              }
              if (headingBeginRegex.test(nextLine)) {
                break;
              }
              if (htmlBeginRegex.test(nextLine)) {
                break;
              }
              if (nextBulletRegex.test(nextLine)) {
                break;
              }
              if (hrRegex.test(nextLine)) {
                break;
              }
              if (nextLineWithoutTabs.search(/[^ ]/) >= indent || !nextLine.trim()) {
                itemContents += `
` + nextLineWithoutTabs.slice(indent);
              } else {
                if (blankLine) {
                  break;
                }
                if (line.replace(/\t/g, "    ").search(/[^ ]/) >= 4) {
                  break;
                }
                if (fencesBeginRegex.test(line)) {
                  break;
                }
                if (headingBeginRegex.test(line)) {
                  break;
                }
                if (hrRegex.test(line)) {
                  break;
                }
                itemContents += `
` + nextLine;
              }
              if (!blankLine && !nextLine.trim()) {
                blankLine = true;
              }
              raw += rawLine + `
`;
              src = src.substring(rawLine.length + 1);
              line = nextLineWithoutTabs.slice(indent);
            }
          }
          if (!list.loose) {
            if (endsWithBlankLine) {
              list.loose = true;
            } else if (/\n[ \t]*\n[ \t]*$/.test(raw)) {
              endsWithBlankLine = true;
            }
          }
          let istask = null;
          let ischecked;
          if (this.options.gfm) {
            istask = /^\[[ xX]\] /.exec(itemContents);
            if (istask) {
              ischecked = istask[0] !== "[ ] ";
              itemContents = itemContents.replace(/^\[[ xX]\] +/, "");
            }
          }
          list.items.push({
            type: "list_item",
            raw,
            task: !!istask,
            checked: ischecked,
            loose: false,
            text: itemContents,
            tokens: []
          });
          list.raw += raw;
        }
        list.items[list.items.length - 1].raw = list.items[list.items.length - 1].raw.trimEnd();
        list.items[list.items.length - 1].text = list.items[list.items.length - 1].text.trimEnd();
        list.raw = list.raw.trimEnd();
        for (let i = 0;i < list.items.length; i++) {
          this.lexer.state.top = false;
          list.items[i].tokens = this.lexer.blockTokens(list.items[i].text, []);
          if (!list.loose) {
            const spacers = list.items[i].tokens.filter((t) => t.type === "space");
            const hasMultipleLineBreaks = spacers.length > 0 && spacers.some((t) => /\n.*\n/.test(t.raw));
            list.loose = hasMultipleLineBreaks;
          }
        }
        if (list.loose) {
          for (let i = 0;i < list.items.length; i++) {
            list.items[i].loose = true;
          }
        }
        return list;
      }
    }
    html(src) {
      const cap = this.rules.block.html.exec(src);
      if (cap) {
        const token = {
          type: "html",
          block: true,
          raw: cap[0],
          pre: cap[1] === "pre" || cap[1] === "script" || cap[1] === "style",
          text: cap[0]
        };
        return token;
      }
    }
    def(src) {
      const cap = this.rules.block.def.exec(src);
      if (cap) {
        const tag = cap[1].toLowerCase().replace(/\s+/g, " ");
        const href = cap[2] ? cap[2].replace(/^<(.*)>$/, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "";
        const title = cap[3] ? cap[3].substring(1, cap[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : cap[3];
        return {
          type: "def",
          tag,
          raw: cap[0],
          href,
          title
        };
      }
    }
    table(src) {
      const cap = this.rules.block.table.exec(src);
      if (!cap) {
        return;
      }
      if (!/[:|]/.test(cap[2])) {
        return;
      }
      const headers = splitCells(cap[1]);
      const aligns = cap[2].replace(/^\||\| *$/g, "").split("|");
      const rows = cap[3] && cap[3].trim() ? cap[3].replace(/\n[ \t]*$/, "").split(`
`) : [];
      const item = {
        type: "table",
        raw: cap[0],
        header: [],
        align: [],
        rows: []
      };
      if (headers.length !== aligns.length) {
        return;
      }
      for (const align of aligns) {
        if (/^ *-+: *$/.test(align)) {
          item.align.push("right");
        } else if (/^ *:-+: *$/.test(align)) {
          item.align.push("center");
        } else if (/^ *:-+ *$/.test(align)) {
          item.align.push("left");
        } else {
          item.align.push(null);
        }
      }
      for (let i = 0;i < headers.length; i++) {
        item.header.push({
          text: headers[i],
          tokens: this.lexer.inline(headers[i]),
          header: true,
          align: item.align[i]
        });
      }
      for (const row of rows) {
        item.rows.push(splitCells(row, item.header.length).map((cell, i) => {
          return {
            text: cell,
            tokens: this.lexer.inline(cell),
            header: false,
            align: item.align[i]
          };
        }));
      }
      return item;
    }
    lheading(src) {
      const cap = this.rules.block.lheading.exec(src);
      if (cap) {
        return {
          type: "heading",
          raw: cap[0],
          depth: cap[2].charAt(0) === "=" ? 1 : 2,
          text: cap[1],
          tokens: this.lexer.inline(cap[1])
        };
      }
    }
    paragraph(src) {
      const cap = this.rules.block.paragraph.exec(src);
      if (cap) {
        const text = cap[1].charAt(cap[1].length - 1) === `
` ? cap[1].slice(0, -1) : cap[1];
        return {
          type: "paragraph",
          raw: cap[0],
          text,
          tokens: this.lexer.inline(text)
        };
      }
    }
    text(src) {
      const cap = this.rules.block.text.exec(src);
      if (cap) {
        return {
          type: "text",
          raw: cap[0],
          text: cap[0],
          tokens: this.lexer.inline(cap[0])
        };
      }
    }
    escape(src) {
      const cap = this.rules.inline.escape.exec(src);
      if (cap) {
        return {
          type: "escape",
          raw: cap[0],
          text: escape$1(cap[1])
        };
      }
    }
    tag(src) {
      const cap = this.rules.inline.tag.exec(src);
      if (cap) {
        if (!this.lexer.state.inLink && /^<a /i.test(cap[0])) {
          this.lexer.state.inLink = true;
        } else if (this.lexer.state.inLink && /^<\/a>/i.test(cap[0])) {
          this.lexer.state.inLink = false;
        }
        if (!this.lexer.state.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
          this.lexer.state.inRawBlock = true;
        } else if (this.lexer.state.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
          this.lexer.state.inRawBlock = false;
        }
        return {
          type: "html",
          raw: cap[0],
          inLink: this.lexer.state.inLink,
          inRawBlock: this.lexer.state.inRawBlock,
          block: false,
          text: cap[0]
        };
      }
    }
    link(src) {
      const cap = this.rules.inline.link.exec(src);
      if (cap) {
        const trimmedUrl = cap[2].trim();
        if (!this.options.pedantic && /^</.test(trimmedUrl)) {
          if (!/>$/.test(trimmedUrl)) {
            return;
          }
          const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), "\\");
          if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
            return;
          }
        } else {
          const lastParenIndex = findClosingBracket(cap[2], "()");
          if (lastParenIndex > -1) {
            const start = cap[0].indexOf("!") === 0 ? 5 : 4;
            const linkLen = start + cap[1].length + lastParenIndex;
            cap[2] = cap[2].substring(0, lastParenIndex);
            cap[0] = cap[0].substring(0, linkLen).trim();
            cap[3] = "";
          }
        }
        let href = cap[2];
        let title = "";
        if (this.options.pedantic) {
          const link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);
          if (link) {
            href = link[1];
            title = link[3];
          }
        } else {
          title = cap[3] ? cap[3].slice(1, -1) : "";
        }
        href = href.trim();
        if (/^</.test(href)) {
          if (this.options.pedantic && !/>$/.test(trimmedUrl)) {
            href = href.slice(1);
          } else {
            href = href.slice(1, -1);
          }
        }
        return outputLink(cap, {
          href: href ? href.replace(this.rules.inline.anyPunctuation, "$1") : href,
          title: title ? title.replace(this.rules.inline.anyPunctuation, "$1") : title
        }, cap[0], this.lexer);
      }
    }
    reflink(src, links) {
      let cap;
      if ((cap = this.rules.inline.reflink.exec(src)) || (cap = this.rules.inline.nolink.exec(src))) {
        const linkString = (cap[2] || cap[1]).replace(/\s+/g, " ");
        const link = links[linkString.toLowerCase()];
        if (!link) {
          const text = cap[0].charAt(0);
          return {
            type: "text",
            raw: text,
            text
          };
        }
        return outputLink(cap, link, cap[0], this.lexer);
      }
    }
    emStrong(src, maskedSrc, prevChar = "") {
      let match = this.rules.inline.emStrongLDelim.exec(src);
      if (!match)
        return;
      if (match[3] && prevChar.match(/[\p{L}\p{N}]/u))
        return;
      const nextChar = match[1] || match[2] || "";
      if (!nextChar || !prevChar || this.rules.inline.punctuation.exec(prevChar)) {
        const lLength = [...match[0]].length - 1;
        let rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;
        const endReg = match[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
        endReg.lastIndex = 0;
        maskedSrc = maskedSrc.slice(-1 * src.length + lLength);
        while ((match = endReg.exec(maskedSrc)) != null) {
          rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
          if (!rDelim)
            continue;
          rLength = [...rDelim].length;
          if (match[3] || match[4]) {
            delimTotal += rLength;
            continue;
          } else if (match[5] || match[6]) {
            if (lLength % 3 && !((lLength + rLength) % 3)) {
              midDelimTotal += rLength;
              continue;
            }
          }
          delimTotal -= rLength;
          if (delimTotal > 0)
            continue;
          rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);
          const lastCharLength = [...match[0]][0].length;
          const raw = src.slice(0, lLength + match.index + lastCharLength + rLength);
          if (Math.min(lLength, rLength) % 2) {
            const text = raw.slice(1, -1);
            return {
              type: "em",
              raw,
              text,
              tokens: this.lexer.inlineTokens(text)
            };
          }
          const text = raw.slice(2, -2);
          return {
            type: "strong",
            raw,
            text,
            tokens: this.lexer.inlineTokens(text)
          };
        }
      }
    }
    codespan(src) {
      const cap = this.rules.inline.code.exec(src);
      if (cap) {
        let text = cap[2].replace(/\n/g, " ");
        const hasNonSpaceChars = /[^ ]/.test(text);
        const hasSpaceCharsOnBothEnds = /^ /.test(text) && / $/.test(text);
        if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
          text = text.substring(1, text.length - 1);
        }
        text = escape$1(text, true);
        return {
          type: "codespan",
          raw: cap[0],
          text
        };
      }
    }
    br(src) {
      const cap = this.rules.inline.br.exec(src);
      if (cap) {
        return {
          type: "br",
          raw: cap[0]
        };
      }
    }
    del(src) {
      const cap = this.rules.inline.del.exec(src);
      if (cap) {
        return {
          type: "del",
          raw: cap[0],
          text: cap[2],
          tokens: this.lexer.inlineTokens(cap[2])
        };
      }
    }
    autolink(src) {
      const cap = this.rules.inline.autolink.exec(src);
      if (cap) {
        let text, href;
        if (cap[2] === "@") {
          text = escape$1(cap[1]);
          href = "mailto:" + text;
        } else {
          text = escape$1(cap[1]);
          href = text;
        }
        return {
          type: "link",
          raw: cap[0],
          text,
          href,
          tokens: [
            {
              type: "text",
              raw: text,
              text
            }
          ]
        };
      }
    }
    url(src) {
      let cap;
      if (cap = this.rules.inline.url.exec(src)) {
        let text, href;
        if (cap[2] === "@") {
          text = escape$1(cap[0]);
          href = "mailto:" + text;
        } else {
          let prevCapZero;
          do {
            prevCapZero = cap[0];
            cap[0] = this.rules.inline._backpedal.exec(cap[0])?.[0] ?? "";
          } while (prevCapZero !== cap[0]);
          text = escape$1(cap[0]);
          if (cap[1] === "www.") {
            href = "http://" + cap[0];
          } else {
            href = cap[0];
          }
        }
        return {
          type: "link",
          raw: cap[0],
          text,
          href,
          tokens: [
            {
              type: "text",
              raw: text,
              text
            }
          ]
        };
      }
    }
    inlineText(src) {
      const cap = this.rules.inline.text.exec(src);
      if (cap) {
        let text;
        if (this.lexer.state.inRawBlock) {
          text = cap[0];
        } else {
          text = escape$1(cap[0]);
        }
        return {
          type: "text",
          raw: cap[0],
          text
        };
      }
    }
  }
  var newline = /^(?:[ \t]*(?:\n|$))+/;
  var blockCode = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
  var fences = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
  var hr = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
  var heading = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
  var bullet = /(?:[*+-]|\d{1,9}[.)])/;
  var lheading = edit(/^(?!bull |blockCode|fences|blockquote|heading|html)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html))+?)\n {0,3}(=+|-+) *(?:\n+|$)/).replace(/bull/g, bullet).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).getRegex();
  var _paragraph = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/;
  var blockText = /^[^\n]+/;
  var _blockLabel = /(?!\s*\])(?:\\.|[^\[\]\\])+/;
  var def = edit(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", _blockLabel).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
  var list = edit(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, bullet).getRegex();
  var _tag = "address|article|aside|base|basefont|blockquote|body|caption" + "|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption" + "|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe" + "|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option" + "|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title" + "|tr|track|ul";
  var _comment = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
  var html = edit("^ {0,3}(?:" + "<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)" + "|comment[^\\n]*(\\n+|$)" + "|<\\?[\\s\\S]*?(?:\\?>\\n*|$)" + "|<![A-Z][\\s\\S]*?(?:>\\n*|$)" + "|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)" + "|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)" + "|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)" + "|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)" + ")", "i").replace("comment", _comment).replace("tag", _tag).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
  var paragraph = edit(_paragraph).replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex();
  var blockquote = edit(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", paragraph).getRegex();
  var blockNormal = {
    blockquote,
    code: blockCode,
    def,
    fences,
    heading,
    hr,
    html,
    lheading,
    list,
    newline,
    paragraph,
    table: noopTest,
    text: blockText
  };
  var gfmTable = edit("^ *([^\\n ].*)\\n" + " {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)" + "(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}\t)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex();
  var blockGfm = {
    ...blockNormal,
    table: gfmTable,
    paragraph: edit(_paragraph).replace("hr", hr).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", gfmTable).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", _tag).getRegex()
  };
  var blockPedantic = {
    ...blockNormal,
    html: edit("^ *(?:comment *(?:\\n|\\s*$)" + "|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)" + `|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", _comment).replace(/tag/g, "(?!(?:" + "a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub" + "|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)" + "\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),
    def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
    heading: /^(#{1,6})(.*)(?:\n+|$)/,
    fences: noopTest,
    lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
    paragraph: edit(_paragraph).replace("hr", hr).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", lheading).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex()
  };
  var escape = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
  var inlineCode = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
  var br = /^( {2,}|\\)\n(?!\s*$)/;
  var inlineText = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
  var _punctuation = "\\p{P}\\p{S}";
  var punctuation = edit(/^((?![*_])[\spunctuation])/, "u").replace(/punctuation/g, _punctuation).getRegex();
  var blockSkip = /\[[^[\]]*?\]\((?:\\.|[^\\\(\)]|\((?:\\.|[^\\\(\)])*\))*\)|`[^`]*?`|<[^<>]*?>/g;
  var emStrongLDelim = edit(/^(?:\*+(?:((?!\*)[punct])|[^\s*]))|^_+(?:((?!_)[punct])|([^\s_]))/, "u").replace(/punct/g, _punctuation).getRegex();
  var emStrongRDelimAst = edit("^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)" + "|[^*]+(?=[^*])" + "|(?!\\*)[punct](\\*+)(?=[\\s]|$)" + "|[^punct\\s](\\*+)(?!\\*)(?=[punct\\s]|$)" + "|(?!\\*)[punct\\s](\\*+)(?=[^punct\\s])" + "|[\\s](\\*+)(?!\\*)(?=[punct])" + "|(?!\\*)[punct](\\*+)(?!\\*)(?=[punct])" + "|[^punct\\s](\\*+)(?=[^punct\\s])", "gu").replace(/punct/g, _punctuation).getRegex();
  var emStrongRDelimUnd = edit("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)" + "|[^_]+(?=[^_])" + "|(?!_)[punct](_+)(?=[\\s]|$)" + "|[^punct\\s](_+)(?!_)(?=[punct\\s]|$)" + "|(?!_)[punct\\s](_+)(?=[^punct\\s])" + "|[\\s](_+)(?!_)(?=[punct])" + "|(?!_)[punct](_+)(?!_)(?=[punct])", "gu").replace(/punct/g, _punctuation).getRegex();
  var anyPunctuation = edit(/\\([punct])/, "gu").replace(/punct/g, _punctuation).getRegex();
  var autolink = edit(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
  var _inlineComment = edit(_comment).replace("(?:-->|$)", "-->").getRegex();
  var tag = edit("^comment" + "|^</[a-zA-Z][\\w:-]*\\s*>" + "|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>" + "|^<\\?[\\s\\S]*?\\?>" + "|^<![a-zA-Z]+\\s[\\s\\S]*?>" + "|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", _inlineComment).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
  var _inlineLabel = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
  var link = edit(/^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/).replace("label", _inlineLabel).replace("href", /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
  var reflink = edit(/^!?\[(label)\]\[(ref)\]/).replace("label", _inlineLabel).replace("ref", _blockLabel).getRegex();
  var nolink = edit(/^!?\[(ref)\](?:\[\])?/).replace("ref", _blockLabel).getRegex();
  var reflinkSearch = edit("reflink|nolink(?!\\()", "g").replace("reflink", reflink).replace("nolink", nolink).getRegex();
  var inlineNormal = {
    _backpedal: noopTest,
    anyPunctuation,
    autolink,
    blockSkip,
    br,
    code: inlineCode,
    del: noopTest,
    emStrongLDelim,
    emStrongRDelimAst,
    emStrongRDelimUnd,
    escape,
    link,
    nolink,
    punctuation,
    reflink,
    reflinkSearch,
    tag,
    text: inlineText,
    url: noopTest
  };
  var inlinePedantic = {
    ...inlineNormal,
    link: edit(/^!?\[(label)\]\((.*?)\)/).replace("label", _inlineLabel).getRegex(),
    reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", _inlineLabel).getRegex()
  };
  var inlineGfm = {
    ...inlineNormal,
    escape: edit(escape).replace("])", "~|])").getRegex(),
    url: edit(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/, "i").replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),
    _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
    del: /^(~~?)(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))\1(?=[^~]|$)/,
    text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/
  };
  var inlineBreaks = {
    ...inlineGfm,
    br: edit(br).replace("{2,}", "*").getRegex(),
    text: edit(inlineGfm.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex()
  };
  var block = {
    normal: blockNormal,
    gfm: blockGfm,
    pedantic: blockPedantic
  };
  var inline = {
    normal: inlineNormal,
    gfm: inlineGfm,
    breaks: inlineBreaks,
    pedantic: inlinePedantic
  };

  class _Lexer {
    tokens;
    options;
    state;
    tokenizer;
    inlineQueue;
    constructor(options) {
      this.tokens = [];
      this.tokens.links = Object.create(null);
      this.options = options || _defaults;
      this.options.tokenizer = this.options.tokenizer || new _Tokenizer;
      this.tokenizer = this.options.tokenizer;
      this.tokenizer.options = this.options;
      this.tokenizer.lexer = this;
      this.inlineQueue = [];
      this.state = {
        inLink: false,
        inRawBlock: false,
        top: true
      };
      const rules = {
        block: block.normal,
        inline: inline.normal
      };
      if (this.options.pedantic) {
        rules.block = block.pedantic;
        rules.inline = inline.pedantic;
      } else if (this.options.gfm) {
        rules.block = block.gfm;
        if (this.options.breaks) {
          rules.inline = inline.breaks;
        } else {
          rules.inline = inline.gfm;
        }
      }
      this.tokenizer.rules = rules;
    }
    static get rules() {
      return {
        block,
        inline
      };
    }
    static lex(src, options) {
      const lexer = new _Lexer(options);
      return lexer.lex(src);
    }
    static lexInline(src, options) {
      const lexer = new _Lexer(options);
      return lexer.inlineTokens(src);
    }
    lex(src) {
      src = src.replace(/\r\n|\r/g, `
`);
      this.blockTokens(src, this.tokens);
      for (let i = 0;i < this.inlineQueue.length; i++) {
        const next = this.inlineQueue[i];
        this.inlineTokens(next.src, next.tokens);
      }
      this.inlineQueue = [];
      return this.tokens;
    }
    blockTokens(src, tokens = [], lastParagraphClipped = false) {
      if (this.options.pedantic) {
        src = src.replace(/\t/g, "    ").replace(/^ +$/gm, "");
      }
      let token;
      let lastToken;
      let cutSrc;
      while (src) {
        if (this.options.extensions && this.options.extensions.block && this.options.extensions.block.some((extTokenizer) => {
          if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            return true;
          }
          return false;
        })) {
          continue;
        }
        if (token = this.tokenizer.space(src)) {
          src = src.substring(token.raw.length);
          if (token.raw.length === 1 && tokens.length > 0) {
            tokens[tokens.length - 1].raw += `
`;
          } else {
            tokens.push(token);
          }
          continue;
        }
        if (token = this.tokenizer.code(src)) {
          src = src.substring(token.raw.length);
          lastToken = tokens[tokens.length - 1];
          if (lastToken && (lastToken.type === "paragraph" || lastToken.type === "text")) {
            lastToken.raw += `
` + token.raw;
            lastToken.text += `
` + token.text;
            this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
          } else {
            tokens.push(token);
          }
          continue;
        }
        if (token = this.tokenizer.fences(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.heading(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.hr(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.blockquote(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.list(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.html(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.def(src)) {
          src = src.substring(token.raw.length);
          lastToken = tokens[tokens.length - 1];
          if (lastToken && (lastToken.type === "paragraph" || lastToken.type === "text")) {
            lastToken.raw += `
` + token.raw;
            lastToken.text += `
` + token.raw;
            this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
          } else if (!this.tokens.links[token.tag]) {
            this.tokens.links[token.tag] = {
              href: token.href,
              title: token.title
            };
          }
          continue;
        }
        if (token = this.tokenizer.table(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.lheading(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        cutSrc = src;
        if (this.options.extensions && this.options.extensions.startBlock) {
          let startIndex = Infinity;
          const tempSrc = src.slice(1);
          let tempStart;
          this.options.extensions.startBlock.forEach((getStartIndex) => {
            tempStart = getStartIndex.call({ lexer: this }, tempSrc);
            if (typeof tempStart === "number" && tempStart >= 0) {
              startIndex = Math.min(startIndex, tempStart);
            }
          });
          if (startIndex < Infinity && startIndex >= 0) {
            cutSrc = src.substring(0, startIndex + 1);
          }
        }
        if (this.state.top && (token = this.tokenizer.paragraph(cutSrc))) {
          lastToken = tokens[tokens.length - 1];
          if (lastParagraphClipped && lastToken?.type === "paragraph") {
            lastToken.raw += `
` + token.raw;
            lastToken.text += `
` + token.text;
            this.inlineQueue.pop();
            this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
          } else {
            tokens.push(token);
          }
          lastParagraphClipped = cutSrc.length !== src.length;
          src = src.substring(token.raw.length);
          continue;
        }
        if (token = this.tokenizer.text(src)) {
          src = src.substring(token.raw.length);
          lastToken = tokens[tokens.length - 1];
          if (lastToken && lastToken.type === "text") {
            lastToken.raw += `
` + token.raw;
            lastToken.text += `
` + token.text;
            this.inlineQueue.pop();
            this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
          } else {
            tokens.push(token);
          }
          continue;
        }
        if (src) {
          const errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
          if (this.options.silent) {
            console.error(errMsg);
            break;
          } else {
            throw new Error(errMsg);
          }
        }
      }
      this.state.top = true;
      return tokens;
    }
    inline(src, tokens = []) {
      this.inlineQueue.push({ src, tokens });
      return tokens;
    }
    inlineTokens(src, tokens = []) {
      let token, lastToken, cutSrc;
      let maskedSrc = src;
      let match;
      let keepPrevChar, prevChar;
      if (this.tokens.links) {
        const links = Object.keys(this.tokens.links);
        if (links.length > 0) {
          while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
            if (links.includes(match[0].slice(match[0].lastIndexOf("[") + 1, -1))) {
              maskedSrc = maskedSrc.slice(0, match.index) + "[" + "a".repeat(match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
            }
          }
        }
      }
      while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
        maskedSrc = maskedSrc.slice(0, match.index) + "[" + "a".repeat(match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
      }
      while ((match = this.tokenizer.rules.inline.anyPunctuation.exec(maskedSrc)) != null) {
        maskedSrc = maskedSrc.slice(0, match.index) + "++" + maskedSrc.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
      }
      while (src) {
        if (!keepPrevChar) {
          prevChar = "";
        }
        keepPrevChar = false;
        if (this.options.extensions && this.options.extensions.inline && this.options.extensions.inline.some((extTokenizer) => {
          if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            return true;
          }
          return false;
        })) {
          continue;
        }
        if (token = this.tokenizer.escape(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.tag(src)) {
          src = src.substring(token.raw.length);
          lastToken = tokens[tokens.length - 1];
          if (lastToken && token.type === "text" && lastToken.type === "text") {
            lastToken.raw += token.raw;
            lastToken.text += token.text;
          } else {
            tokens.push(token);
          }
          continue;
        }
        if (token = this.tokenizer.link(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.reflink(src, this.tokens.links)) {
          src = src.substring(token.raw.length);
          lastToken = tokens[tokens.length - 1];
          if (lastToken && token.type === "text" && lastToken.type === "text") {
            lastToken.raw += token.raw;
            lastToken.text += token.text;
          } else {
            tokens.push(token);
          }
          continue;
        }
        if (token = this.tokenizer.emStrong(src, maskedSrc, prevChar)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.codespan(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.br(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.del(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (token = this.tokenizer.autolink(src)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        if (!this.state.inLink && (token = this.tokenizer.url(src))) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          continue;
        }
        cutSrc = src;
        if (this.options.extensions && this.options.extensions.startInline) {
          let startIndex = Infinity;
          const tempSrc = src.slice(1);
          let tempStart;
          this.options.extensions.startInline.forEach((getStartIndex) => {
            tempStart = getStartIndex.call({ lexer: this }, tempSrc);
            if (typeof tempStart === "number" && tempStart >= 0) {
              startIndex = Math.min(startIndex, tempStart);
            }
          });
          if (startIndex < Infinity && startIndex >= 0) {
            cutSrc = src.substring(0, startIndex + 1);
          }
        }
        if (token = this.tokenizer.inlineText(cutSrc)) {
          src = src.substring(token.raw.length);
          if (token.raw.slice(-1) !== "_") {
            prevChar = token.raw.slice(-1);
          }
          keepPrevChar = true;
          lastToken = tokens[tokens.length - 1];
          if (lastToken && lastToken.type === "text") {
            lastToken.raw += token.raw;
            lastToken.text += token.text;
          } else {
            tokens.push(token);
          }
          continue;
        }
        if (src) {
          const errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
          if (this.options.silent) {
            console.error(errMsg);
            break;
          } else {
            throw new Error(errMsg);
          }
        }
      }
      return tokens;
    }
  }

  class _Renderer {
    options;
    parser;
    constructor(options) {
      this.options = options || _defaults;
    }
    space(token) {
      return "";
    }
    code({ text, lang, escaped }) {
      const langString = (lang || "").match(/^\S*/)?.[0];
      const code = text.replace(/\n$/, "") + `
`;
      if (!langString) {
        return "<pre><code>" + (escaped ? code : escape$1(code, true)) + `</code></pre>
`;
      }
      return '<pre><code class="language-' + escape$1(langString) + '">' + (escaped ? code : escape$1(code, true)) + `</code></pre>
`;
    }
    blockquote({ tokens }) {
      const body = this.parser.parse(tokens);
      return `<blockquote>
${body}</blockquote>
`;
    }
    html({ text }) {
      return text;
    }
    heading({ tokens, depth }) {
      return `<h${depth}>${this.parser.parseInline(tokens)}</h${depth}>
`;
    }
    hr(token) {
      return `<hr>
`;
    }
    list(token) {
      const ordered = token.ordered;
      const start = token.start;
      let body = "";
      for (let j = 0;j < token.items.length; j++) {
        const item = token.items[j];
        body += this.listitem(item);
      }
      const type = ordered ? "ol" : "ul";
      const startAttr = ordered && start !== 1 ? ' start="' + start + '"' : "";
      return "<" + type + startAttr + `>
` + body + "</" + type + `>
`;
    }
    listitem(item) {
      let itemBody = "";
      if (item.task) {
        const checkbox = this.checkbox({ checked: !!item.checked });
        if (item.loose) {
          if (item.tokens.length > 0 && item.tokens[0].type === "paragraph") {
            item.tokens[0].text = checkbox + " " + item.tokens[0].text;
            if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === "text") {
              item.tokens[0].tokens[0].text = checkbox + " " + item.tokens[0].tokens[0].text;
            }
          } else {
            item.tokens.unshift({
              type: "text",
              raw: checkbox + " ",
              text: checkbox + " "
            });
          }
        } else {
          itemBody += checkbox + " ";
        }
      }
      itemBody += this.parser.parse(item.tokens, !!item.loose);
      return `<li>${itemBody}</li>
`;
    }
    checkbox({ checked }) {
      return "<input " + (checked ? 'checked="" ' : "") + 'disabled="" type="checkbox">';
    }
    paragraph({ tokens }) {
      return `<p>${this.parser.parseInline(tokens)}</p>
`;
    }
    table(token) {
      let header = "";
      let cell = "";
      for (let j = 0;j < token.header.length; j++) {
        cell += this.tablecell(token.header[j]);
      }
      header += this.tablerow({ text: cell });
      let body = "";
      for (let j = 0;j < token.rows.length; j++) {
        const row = token.rows[j];
        cell = "";
        for (let k = 0;k < row.length; k++) {
          cell += this.tablecell(row[k]);
        }
        body += this.tablerow({ text: cell });
      }
      if (body)
        body = `<tbody>${body}</tbody>`;
      return `<table>
` + `<thead>
` + header + `</thead>
` + body + `</table>
`;
    }
    tablerow({ text }) {
      return `<tr>
${text}</tr>
`;
    }
    tablecell(token) {
      const content = this.parser.parseInline(token.tokens);
      const type = token.header ? "th" : "td";
      const tag = token.align ? `<${type} align="${token.align}">` : `<${type}>`;
      return tag + content + `</${type}>
`;
    }
    strong({ tokens }) {
      return `<strong>${this.parser.parseInline(tokens)}</strong>`;
    }
    em({ tokens }) {
      return `<em>${this.parser.parseInline(tokens)}</em>`;
    }
    codespan({ text }) {
      return `<code>${text}</code>`;
    }
    br(token) {
      return "<br>";
    }
    del({ tokens }) {
      return `<del>${this.parser.parseInline(tokens)}</del>`;
    }
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const cleanHref = cleanUrl(href);
      if (cleanHref === null) {
        return text;
      }
      href = cleanHref;
      let out = '<a href="' + href + '"';
      if (title) {
        out += ' title="' + title + '"';
      }
      out += ">" + text + "</a>";
      return out;
    }
    image({ href, title, text }) {
      const cleanHref = cleanUrl(href);
      if (cleanHref === null) {
        return text;
      }
      href = cleanHref;
      let out = `<img src="${href}" alt="${text}"`;
      if (title) {
        out += ` title="${title}"`;
      }
      out += ">";
      return out;
    }
    text(token) {
      return "tokens" in token && token.tokens ? this.parser.parseInline(token.tokens) : token.text;
    }
  }

  class _TextRenderer {
    strong({ text }) {
      return text;
    }
    em({ text }) {
      return text;
    }
    codespan({ text }) {
      return text;
    }
    del({ text }) {
      return text;
    }
    html({ text }) {
      return text;
    }
    text({ text }) {
      return text;
    }
    link({ text }) {
      return "" + text;
    }
    image({ text }) {
      return "" + text;
    }
    br() {
      return "";
    }
  }

  class _Parser {
    options;
    renderer;
    textRenderer;
    constructor(options) {
      this.options = options || _defaults;
      this.options.renderer = this.options.renderer || new _Renderer;
      this.renderer = this.options.renderer;
      this.renderer.options = this.options;
      this.renderer.parser = this;
      this.textRenderer = new _TextRenderer;
    }
    static parse(tokens, options) {
      const parser = new _Parser(options);
      return parser.parse(tokens);
    }
    static parseInline(tokens, options) {
      const parser = new _Parser(options);
      return parser.parseInline(tokens);
    }
    parse(tokens, top = true) {
      let out = "";
      for (let i = 0;i < tokens.length; i++) {
        const anyToken = tokens[i];
        if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[anyToken.type]) {
          const genericToken = anyToken;
          const ret = this.options.extensions.renderers[genericToken.type].call({ parser: this }, genericToken);
          if (ret !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "paragraph", "text"].includes(genericToken.type)) {
            out += ret || "";
            continue;
          }
        }
        const token = anyToken;
        switch (token.type) {
          case "space": {
            out += this.renderer.space(token);
            continue;
          }
          case "hr": {
            out += this.renderer.hr(token);
            continue;
          }
          case "heading": {
            out += this.renderer.heading(token);
            continue;
          }
          case "code": {
            out += this.renderer.code(token);
            continue;
          }
          case "table": {
            out += this.renderer.table(token);
            continue;
          }
          case "blockquote": {
            out += this.renderer.blockquote(token);
            continue;
          }
          case "list": {
            out += this.renderer.list(token);
            continue;
          }
          case "html": {
            out += this.renderer.html(token);
            continue;
          }
          case "paragraph": {
            out += this.renderer.paragraph(token);
            continue;
          }
          case "text": {
            let textToken = token;
            let body = this.renderer.text(textToken);
            while (i + 1 < tokens.length && tokens[i + 1].type === "text") {
              textToken = tokens[++i];
              body += `
` + this.renderer.text(textToken);
            }
            if (top) {
              out += this.renderer.paragraph({
                type: "paragraph",
                raw: body,
                text: body,
                tokens: [{ type: "text", raw: body, text: body }]
              });
            } else {
              out += body;
            }
            continue;
          }
          default: {
            const errMsg = 'Token with "' + token.type + '" type was not found.';
            if (this.options.silent) {
              console.error(errMsg);
              return "";
            } else {
              throw new Error(errMsg);
            }
          }
        }
      }
      return out;
    }
    parseInline(tokens, renderer) {
      renderer = renderer || this.renderer;
      let out = "";
      for (let i = 0;i < tokens.length; i++) {
        const anyToken = tokens[i];
        if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[anyToken.type]) {
          const ret = this.options.extensions.renderers[anyToken.type].call({ parser: this }, anyToken);
          if (ret !== false || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(anyToken.type)) {
            out += ret || "";
            continue;
          }
        }
        const token = anyToken;
        switch (token.type) {
          case "escape": {
            out += renderer.text(token);
            break;
          }
          case "html": {
            out += renderer.html(token);
            break;
          }
          case "link": {
            out += renderer.link(token);
            break;
          }
          case "image": {
            out += renderer.image(token);
            break;
          }
          case "strong": {
            out += renderer.strong(token);
            break;
          }
          case "em": {
            out += renderer.em(token);
            break;
          }
          case "codespan": {
            out += renderer.codespan(token);
            break;
          }
          case "br": {
            out += renderer.br(token);
            break;
          }
          case "del": {
            out += renderer.del(token);
            break;
          }
          case "text": {
            out += renderer.text(token);
            break;
          }
          default: {
            const errMsg = 'Token with "' + token.type + '" type was not found.';
            if (this.options.silent) {
              console.error(errMsg);
              return "";
            } else {
              throw new Error(errMsg);
            }
          }
        }
      }
      return out;
    }
  }

  class _Hooks {
    options;
    block;
    constructor(options) {
      this.options = options || _defaults;
    }
    static passThroughHooks = new Set([
      "preprocess",
      "postprocess",
      "processAllTokens"
    ]);
    preprocess(markdown) {
      return markdown;
    }
    postprocess(html) {
      return html;
    }
    processAllTokens(tokens) {
      return tokens;
    }
    provideLexer() {
      return this.block ? _Lexer.lex : _Lexer.lexInline;
    }
    provideParser() {
      return this.block ? _Parser.parse : _Parser.parseInline;
    }
  }

  class Marked {
    defaults = _getDefaults();
    options = this.setOptions;
    parse = this.parseMarkdown(true);
    parseInline = this.parseMarkdown(false);
    Parser = _Parser;
    Renderer = _Renderer;
    TextRenderer = _TextRenderer;
    Lexer = _Lexer;
    Tokenizer = _Tokenizer;
    Hooks = _Hooks;
    constructor(...args) {
      this.use(...args);
    }
    walkTokens(tokens, callback) {
      let values = [];
      for (const token of tokens) {
        values = values.concat(callback.call(this, token));
        switch (token.type) {
          case "table": {
            const tableToken = token;
            for (const cell of tableToken.header) {
              values = values.concat(this.walkTokens(cell.tokens, callback));
            }
            for (const row of tableToken.rows) {
              for (const cell of row) {
                values = values.concat(this.walkTokens(cell.tokens, callback));
              }
            }
            break;
          }
          case "list": {
            const listToken = token;
            values = values.concat(this.walkTokens(listToken.items, callback));
            break;
          }
          default: {
            const genericToken = token;
            if (this.defaults.extensions?.childTokens?.[genericToken.type]) {
              this.defaults.extensions.childTokens[genericToken.type].forEach((childTokens) => {
                const tokens = genericToken[childTokens].flat(Infinity);
                values = values.concat(this.walkTokens(tokens, callback));
              });
            } else if (genericToken.tokens) {
              values = values.concat(this.walkTokens(genericToken.tokens, callback));
            }
          }
        }
      }
      return values;
    }
    use(...args) {
      const extensions = this.defaults.extensions || { renderers: {}, childTokens: {} };
      args.forEach((pack) => {
        const opts = { ...pack };
        opts.async = this.defaults.async || opts.async || false;
        if (pack.extensions) {
          pack.extensions.forEach((ext) => {
            if (!ext.name) {
              throw new Error("extension name required");
            }
            if ("renderer" in ext) {
              const prevRenderer = extensions.renderers[ext.name];
              if (prevRenderer) {
                extensions.renderers[ext.name] = function(...args) {
                  let ret = ext.renderer.apply(this, args);
                  if (ret === false) {
                    ret = prevRenderer.apply(this, args);
                  }
                  return ret;
                };
              } else {
                extensions.renderers[ext.name] = ext.renderer;
              }
            }
            if ("tokenizer" in ext) {
              if (!ext.level || ext.level !== "block" && ext.level !== "inline") {
                throw new Error("extension level must be 'block' or 'inline'");
              }
              const extLevel = extensions[ext.level];
              if (extLevel) {
                extLevel.unshift(ext.tokenizer);
              } else {
                extensions[ext.level] = [ext.tokenizer];
              }
              if (ext.start) {
                if (ext.level === "block") {
                  if (extensions.startBlock) {
                    extensions.startBlock.push(ext.start);
                  } else {
                    extensions.startBlock = [ext.start];
                  }
                } else if (ext.level === "inline") {
                  if (extensions.startInline) {
                    extensions.startInline.push(ext.start);
                  } else {
                    extensions.startInline = [ext.start];
                  }
                }
              }
            }
            if ("childTokens" in ext && ext.childTokens) {
              extensions.childTokens[ext.name] = ext.childTokens;
            }
          });
          opts.extensions = extensions;
        }
        if (pack.renderer) {
          const renderer = this.defaults.renderer || new _Renderer(this.defaults);
          for (const prop in pack.renderer) {
            if (!(prop in renderer)) {
              throw new Error(`renderer '${prop}' does not exist`);
            }
            if (["options", "parser"].includes(prop)) {
              continue;
            }
            const rendererProp = prop;
            const rendererFunc = pack.renderer[rendererProp];
            const prevRenderer = renderer[rendererProp];
            renderer[rendererProp] = (...args) => {
              let ret = rendererFunc.apply(renderer, args);
              if (ret === false) {
                ret = prevRenderer.apply(renderer, args);
              }
              return ret || "";
            };
          }
          opts.renderer = renderer;
        }
        if (pack.tokenizer) {
          const tokenizer = this.defaults.tokenizer || new _Tokenizer(this.defaults);
          for (const prop in pack.tokenizer) {
            if (!(prop in tokenizer)) {
              throw new Error(`tokenizer '${prop}' does not exist`);
            }
            if (["options", "rules", "lexer"].includes(prop)) {
              continue;
            }
            const tokenizerProp = prop;
            const tokenizerFunc = pack.tokenizer[tokenizerProp];
            const prevTokenizer = tokenizer[tokenizerProp];
            tokenizer[tokenizerProp] = (...args) => {
              let ret = tokenizerFunc.apply(tokenizer, args);
              if (ret === false) {
                ret = prevTokenizer.apply(tokenizer, args);
              }
              return ret;
            };
          }
          opts.tokenizer = tokenizer;
        }
        if (pack.hooks) {
          const hooks = this.defaults.hooks || new _Hooks;
          for (const prop in pack.hooks) {
            if (!(prop in hooks)) {
              throw new Error(`hook '${prop}' does not exist`);
            }
            if (["options", "block"].includes(prop)) {
              continue;
            }
            const hooksProp = prop;
            const hooksFunc = pack.hooks[hooksProp];
            const prevHook = hooks[hooksProp];
            if (_Hooks.passThroughHooks.has(prop)) {
              hooks[hooksProp] = (arg) => {
                if (this.defaults.async) {
                  return Promise.resolve(hooksFunc.call(hooks, arg)).then((ret) => {
                    return prevHook.call(hooks, ret);
                  });
                }
                const ret = hooksFunc.call(hooks, arg);
                return prevHook.call(hooks, ret);
              };
            } else {
              hooks[hooksProp] = (...args) => {
                let ret = hooksFunc.apply(hooks, args);
                if (ret === false) {
                  ret = prevHook.apply(hooks, args);
                }
                return ret;
              };
            }
          }
          opts.hooks = hooks;
        }
        if (pack.walkTokens) {
          const walkTokens = this.defaults.walkTokens;
          const packWalktokens = pack.walkTokens;
          opts.walkTokens = function(token) {
            let values = [];
            values.push(packWalktokens.call(this, token));
            if (walkTokens) {
              values = values.concat(walkTokens.call(this, token));
            }
            return values;
          };
        }
        this.defaults = { ...this.defaults, ...opts };
      });
      return this;
    }
    setOptions(opt) {
      this.defaults = { ...this.defaults, ...opt };
      return this;
    }
    lexer(src, options) {
      return _Lexer.lex(src, options ?? this.defaults);
    }
    parser(tokens, options) {
      return _Parser.parse(tokens, options ?? this.defaults);
    }
    parseMarkdown(blockType) {
      const parse = (src, options) => {
        const origOpt = { ...options };
        const opt = { ...this.defaults, ...origOpt };
        const throwError = this.onError(!!opt.silent, !!opt.async);
        if (this.defaults.async === true && origOpt.async === false) {
          return throwError(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
        }
        if (typeof src === "undefined" || src === null) {
          return throwError(new Error("marked(): input parameter is undefined or null"));
        }
        if (typeof src !== "string") {
          return throwError(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(src) + ", string expected"));
        }
        if (opt.hooks) {
          opt.hooks.options = opt;
          opt.hooks.block = blockType;
        }
        const lexer = opt.hooks ? opt.hooks.provideLexer() : blockType ? _Lexer.lex : _Lexer.lexInline;
        const parser = opt.hooks ? opt.hooks.provideParser() : blockType ? _Parser.parse : _Parser.parseInline;
        if (opt.async) {
          return Promise.resolve(opt.hooks ? opt.hooks.preprocess(src) : src).then((src) => lexer(src, opt)).then((tokens) => opt.hooks ? opt.hooks.processAllTokens(tokens) : tokens).then((tokens) => opt.walkTokens ? Promise.all(this.walkTokens(tokens, opt.walkTokens)).then(() => tokens) : tokens).then((tokens) => parser(tokens, opt)).then((html) => opt.hooks ? opt.hooks.postprocess(html) : html).catch(throwError);
        }
        try {
          if (opt.hooks) {
            src = opt.hooks.preprocess(src);
          }
          let tokens = lexer(src, opt);
          if (opt.hooks) {
            tokens = opt.hooks.processAllTokens(tokens);
          }
          if (opt.walkTokens) {
            this.walkTokens(tokens, opt.walkTokens);
          }
          let html = parser(tokens, opt);
          if (opt.hooks) {
            html = opt.hooks.postprocess(html);
          }
          return html;
        } catch (e) {
          return throwError(e);
        }
      };
      return parse;
    }
    onError(silent, async) {
      return (e) => {
        e.message += `
Please report this to https://github.com/markedjs/marked.`;
        if (silent) {
          const msg = "<p>An error occurred:</p><pre>" + escape$1(e.message + "", true) + "</pre>";
          if (async) {
            return Promise.resolve(msg);
          }
          return msg;
        }
        if (async) {
          return Promise.reject(e);
        }
        throw e;
      };
    }
  }
  var markedInstance = new Marked;
  function marked(src, opt) {
    return markedInstance.parse(src, opt);
  }
  marked.options = marked.setOptions = function(options) {
    markedInstance.setOptions(options);
    marked.defaults = markedInstance.defaults;
    changeDefaults(marked.defaults);
    return marked;
  };
  marked.getDefaults = _getDefaults;
  marked.defaults = _defaults;
  marked.use = function(...args) {
    markedInstance.use(...args);
    marked.defaults = markedInstance.defaults;
    changeDefaults(marked.defaults);
    return marked;
  };
  marked.walkTokens = function(tokens, callback) {
    return markedInstance.walkTokens(tokens, callback);
  };
  marked.parseInline = markedInstance.parseInline;
  marked.Parser = _Parser;
  marked.parser = _Parser.parse;
  marked.Renderer = _Renderer;
  marked.TextRenderer = _TextRenderer;
  marked.Lexer = _Lexer;
  marked.lexer = _Lexer.lex;
  marked.Tokenizer = _Tokenizer;
  marked.Hooks = _Hooks;
  marked.parse = marked;
  var options = marked.options;
  var setOptions = marked.setOptions;
  var use = marked.use;
  var walkTokens = marked.walkTokens;
  var parseInline = marked.parseInline;
  var parser = _Parser.parse;
  var lexer = _Lexer.lex;

  // src/utils/sanitize.ts
  var KEEP_TAGS = new Set([
    "p",
    "br",
    "hr",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "b",
    "strong",
    "i",
    "em",
    "u",
    "s",
    "del",
    "ins",
    "mark",
    "small",
    "sub",
    "sup",
    "code",
    "pre",
    "kbd",
    "blockquote",
    "ul",
    "ol",
    "li",
    "dl",
    "dt",
    "dd",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "caption",
    "span",
    "div",
    "a",
    "details",
    "summary"
  ]);
  var DROP_TAGS = new Set(["script", "style", "iframe", "object", "embed", "form", "input", "button", "textarea", "select", "link", "meta", "base", "svg", "math", "template", "noscript", "frame", "frameset", "img", "video", "audio", "source", "canvas"]);
  var KEEP_ATTRS = new Set(["title", "colspan", "rowspan", "align", "start", "type", "open"]);
  var STYLE_PROPS = new Set(["color", "background-color", "font-weight", "font-style", "text-decoration", "font-size", "text-align"]);
  var SAFE_STYLE_VALUE = /^[#a-z0-9(),.%\s-]+$/i;
  var SAFE_HREF = /^(https?:|mailto:|#|\/)/i;
  function cleanStyle(raw) {
    const out = [];
    for (const decl of raw.split(";")) {
      const index = decl.indexOf(":");
      if (index < 0)
        continue;
      const prop = decl.slice(0, index).trim().toLowerCase();
      const value = decl.slice(index + 1).trim();
      if (STYLE_PROPS.has(prop) && SAFE_STYLE_VALUE.test(value) && !/url|expression/i.test(value))
        out.push(`${prop}: ${value}`);
    }
    return out.join("; ");
  }
  function copyNode(source, target, doc) {
    for (const child of Array.from(source.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        target.appendChild(doc.createTextNode(child.nodeValue ?? ""));
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE)
        continue;
      const el = child;
      const tag = el.tagName.toLowerCase();
      if (DROP_TAGS.has(tag))
        continue;
      if (!KEEP_TAGS.has(tag)) {
        copyNode(el, target, doc);
        continue;
      }
      const clean = doc.createElement(tag);
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (name === "style") {
          const style = cleanStyle(attr.value);
          if (style)
            clean.setAttribute("style", style);
        } else if (name === "href" && tag === "a") {
          if (SAFE_HREF.test(attr.value.trim()))
            clean.setAttribute("href", attr.value.trim());
        } else if (KEEP_ATTRS.has(name)) {
          clean.setAttribute(name, attr.value);
        }
      }
      if (tag === "a") {
        clean.setAttribute("target", "_blank");
        clean.setAttribute("rel", "noopener noreferrer nofollow");
      }
      copyNode(el, clean, doc);
      target.appendChild(clean);
    }
  }
  function sanitizeHtml(html) {
    const parsed = new DOMParser().parseFromString(`<!doctype html><body>${html}`, "text/html");
    const out = document.implementation.createHTMLDocument("");
    const holder = out.createElement("div");
    copyNode(parsed.body, holder, out);
    return holder.innerHTML;
  }

  // src/utils/markdown.ts
  var md = new Marked({ gfm: true, breaks: true, async: false });
  var HTML_TAG = /<\/?(?:p|div|h[1-6]|ul|ol|li|b|strong|em|i|br|hr|table|span|blockquote|pre|code)\b[^>]*>/i;
  var MD_MARK = /(?:^|\n)\s{0,3}(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```|---\s*(?:\n|$))/;
  function inferRenderMode(text, fallback = "markdown") {
    if (HTML_TAG.test(text))
      return "html";
    if (MD_MARK.test(text))
      return "markdown";
    return fallback;
  }
  function renderMarkdown(text) {
    return sanitizeHtml(md.parse(text));
  }
  function renderContent(text, mode) {
    const resolved = mode ?? inferRenderMode(text);
    return resolved === "html" ? sanitizeHtml(text) : renderMarkdown(text);
  }

  // src/api/records.ts
  var time = (value) => {
    const parsed = Date.parse(value ?? "");
    return Number.isFinite(parsed) ? parsed : 0;
  };
  function isoOrEmpty(value) {
    const parsed = Date.parse(asString(value));
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
  }
  function latest(...values) {
    return values.reduce((best, value) => time(value) > time(best) ? value ?? "" : best, "");
  }
  var newestFirst = (a, b) => time(b.timestamp) - time(a.timestamp);
  function normalizeSummary(raw) {
    if (!isObject(raw))
      return null;
    const summary = raw.summary == null ? "" : String(raw.summary);
    if (!summary.trim())
      return null;
    const mode = asString(raw.renderMode).toLowerCase();
    return {
      summary,
      timestamp: isoOrEmpty(raw.timestamp) || new Date(0).toISOString(),
      model: asString(raw.model) || "未知模型",
      renderMode: mode.includes("html") ? "html" : mode.includes("markdown") ? "markdown" : inferRenderMode(summary, "html")
    };
  }
  function normalizeSummaryList(raw) {
    return Array.isArray(raw) ? raw.map(normalizeSummary).filter((item) => item !== null).toSorted(newestFirst) : [];
  }
  function mergeSummaries(...lists) {
    const seen = new Map;
    for (const item of lists.flat())
      seen.set(`${item.timestamp}\x00${item.model}\x00${item.summary}`, item);
    return Array.from(seen.values()).toSorted(newestFirst);
  }
  function normalizeQA(raw) {
    if (!isObject(raw))
      return null;
    const question = raw.question == null ? "" : String(raw.question);
    const answer = raw.answer == null ? "" : String(raw.answer);
    if (!question.trim() && !answer.trim())
      return null;
    return {
      id: asString(raw.id) || randomId("qa-"),
      question,
      answer,
      presetId: asString(raw.presetId),
      presetName: asString(raw.presetName),
      timestamp: isoOrEmpty(raw.timestamp) || new Date(0).toISOString(),
      model: asString(raw.model) || "未知模型"
    };
  }
  function normalizeQAList(raw) {
    return Array.isArray(raw) ? raw.map(normalizeQA).filter((item) => item !== null).toSorted(newestFirst) : [];
  }
  function mergeQA(...lists) {
    const seen = new Map;
    for (const item of lists.flat())
      seen.set(item.id, item);
    return Array.from(seen.values()).toSorted(newestFirst);
  }
  function normalizeFixes(raw) {
    if (!Array.isArray(raw))
      return [];
    return raw.flatMap((item) => {
      if (!isObject(item))
        return [];
      const from = asString(item.from);
      const to = asString(item.to);
      return from && to && from !== to ? [{ from, to }] : [];
    });
  }
  function normalizeDeArrow(raw) {
    if (!isObject(raw))
      return null;
    const originalTitle = asString(raw.originalTitle);
    if (!originalTitle)
      return null;
    const state = { originalTitle, updatedAt: "" };
    if (typeof raw.verdict === "boolean") {
      state.verdict = raw.verdict;
      state.verdictReason = asString(raw.verdictReason ?? raw.reason);
      state.verdictModel = asString(raw.verdictModel);
      state.verdictUpdatedAt = isoOrEmpty(raw.verdictUpdatedAt);
    }
    const rewritten = asString(raw.rewrittenTitle);
    if (rewritten) {
      state.rewrittenTitle = rewritten;
      state.rewriteModel = asString(raw.rewriteModel ?? raw.rewrittenModel);
      state.rewrittenAt = isoOrEmpty(raw.rewrittenAt);
    }
    const fixCheckedAt = isoOrEmpty(raw.fixCheckedAt);
    if (fixCheckedAt) {
      const fixes = normalizeFixes(raw.fixes);
      if (fixes.length)
        state.fixes = fixes;
      state.fixModel = asString(raw.fixModel);
      state.fixCheckedAt = fixCheckedAt;
    }
    state.updatedAt = latest(isoOrEmpty(raw.updatedAt), state.verdictUpdatedAt, state.rewrittenAt, state.fixCheckedAt);
    return state;
  }
  function normalizeDeArrowMap(raw) {
    const out = {};
    if (!isObject(raw))
      return out;
    for (const [id, value] of Object.entries(raw)) {
      const state = normalizeDeArrow(value);
      if (asString(id) && state)
        out[asString(id)] = state;
    }
    return out;
  }
  function newer(a, b, at) {
    const diff = time(b[at]) - time(a[at]);
    if (diff)
      return diff > 0 ? b : a;
    return JSON.stringify(b) > JSON.stringify(a) ? b : a;
  }
  function pickBundle(a, b, at, present) {
    const hasA = present(a);
    const hasB = present(b);
    if (!hasA)
      return hasB ? b : null;
    if (!hasB)
      return a;
    return newer(a, b, at);
  }
  function mergeDeArrowState(a, b) {
    if (!a)
      return b;
    if (!b)
      return a;
    if (a.originalTitle !== b.originalTitle)
      return newer(a, b, "updatedAt");
    const merged = { originalTitle: a.originalTitle, updatedAt: latest(a.updatedAt, b.updatedAt) };
    const verdict = pickBundle(a, b, "verdictUpdatedAt", (state) => typeof state.verdict === "boolean");
    if (verdict) {
      merged.verdict = verdict.verdict;
      merged.verdictReason = verdict.verdictReason;
      merged.verdictModel = verdict.verdictModel;
      merged.verdictUpdatedAt = verdict.verdictUpdatedAt;
    }
    const rewrite = pickBundle(a, b, "rewrittenAt", (state) => Boolean(state.rewrittenTitle));
    if (rewrite) {
      merged.rewrittenTitle = rewrite.rewrittenTitle;
      merged.rewriteModel = rewrite.rewriteModel;
      merged.rewrittenAt = rewrite.rewrittenAt;
    }
    const fix = pickBundle(a, b, "fixCheckedAt", (state) => Boolean(state.fixCheckedAt));
    if (fix) {
      if (fix.fixes?.length)
        merged.fixes = fix.fixes;
      merged.fixModel = fix.fixModel;
      merged.fixCheckedAt = fix.fixCheckedAt;
    }
    return merged;
  }
  function mergeDeArrowMaps(...maps) {
    const out = {};
    for (const map of maps) {
      for (const [id, state] of Object.entries(map)) {
        const merged = mergeDeArrowState(out[id], state);
        if (merged)
          out[id] = merged;
      }
    }
    return out;
  }

  // src/api/DataStore.ts
  var SAVE_DELAY_MS = 250;

  class RecordStore {
    name;
    key;
    normalize;
    merge;
    cache = null;
    timer = null;
    dirty = new Set;
    replacing = false;
    constructor(name, key, normalize, merge) {
      this.name = name;
      this.key = key;
      this.normalize = normalize;
      this.merge = merge;
    }
    load() {
      this.cache ??= this.normalize(gmGet(this.key, {}));
      return this.cache;
    }
    settle(local, stored, pending) {
      if (local === undefined)
        return pending ? undefined : stored;
      if (stored === undefined)
        return pending ? local : undefined;
      if (this.merge)
        return this.merge(local, stored);
      return pending ? local : stored;
    }
    absorb(stored) {
      const prev = this.load();
      if (this.replacing)
        return [];
      const next = {};
      const changed = [];
      for (const id of new Set([...Object.keys(prev), ...Object.keys(stored)])) {
        const value = this.settle(prev[id], stored[id], this.dirty.has(id));
        if (value !== undefined)
          next[id] = value;
        if (JSON.stringify(value) !== JSON.stringify(prev[id]))
          changed.push(id);
      }
      this.cache = next;
      return changed;
    }
    watchRemote() {
      gmOnRemoteChange(this.key, (value) => {
        const ids = this.absorb(this.normalize(value));
        if (ids.length)
          dispatch("dataChange", { store: this.name, ids, source: "remote" });
      });
    }
    all() {
      return this.load();
    }
    get(id) {
      return this.load()[id];
    }
    has(id) {
      return id in this.load();
    }
    get size() {
      return Object.keys(this.load()).length;
    }
    setMany(entries, source = "local") {
      const data = this.load();
      const ids = Object.keys(entries);
      if (!ids.length)
        return;
      for (const id of ids) {
        const value = entries[id];
        if (value === undefined)
          delete data[id];
        else
          data[id] = value;
        this.dirty.add(id);
      }
      this.schedule();
      dispatch("dataChange", { store: this.name, ids, source });
    }
    set(id, value, source = "local") {
      this.setMany({ [id]: value }, source);
    }
    replaceAll(next, source) {
      const prev = this.load();
      const ids = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)]));
      this.cache = { ...next };
      this.replacing = true;
      this.schedule();
      dispatch("dataChange", { store: this.name, ids, source });
    }
    flush() {
      if (this.timer)
        clearTimeout(this.timer);
      this.timer = null;
      if (!this.cache)
        return;
      if (this.replacing) {
        this.replacing = false;
        this.dirty.clear();
        gmSet(this.key, this.cache);
        return;
      }
      if (!this.dirty.size)
        return;
      const ids = this.absorb(this.normalize(gmGet(this.key, {})));
      this.dirty.clear();
      gmSet(this.key, this.cache);
      if (ids.length)
        dispatch("dataChange", { store: this.name, ids, source: "remote" });
    }
    schedule() {
      if (this.timer)
        return;
      this.timer = setTimeout(() => this.flush(), SAVE_DELAY_MS);
    }
  }
  function listMap(normalizeList) {
    return (raw) => {
      const out = {};
      if (!isObject(raw))
        return out;
      for (const [id, list] of Object.entries(raw)) {
        const items = normalizeList(list);
        if (id.trim() && items.length)
          out[id.trim()] = items;
      }
      return out;
    };
  }
  function flagMap(raw) {
    const out = {};
    const ids = Array.isArray(raw) ? raw : isObject(raw) ? Object.keys(raw) : [];
    for (const id of ids)
      if (String(id).trim())
        out[String(id).trim()] = true;
    return out;
  }
  var Summaries = new RecordStore("summaries", "LDPP.summaries", listMap(normalizeSummaryList));
  var Questions = new RecordStore("questions", "LDPP.questions", listMap(normalizeQAList));
  var Summarized = new RecordStore("summarized", "LDPP.summarized", flagMap);
  var DeArrowStates = new RecordStore("dearrow", "LDPP.dearrow", normalizeDeArrowMap, (local, stored) => mergeDeArrowState(local, stored) ?? local);
  var ALL_STORES = [Summaries, Questions, Summarized, DeArrowStates];
  function initDataStores() {
    for (const store of ALL_STORES)
      store.watchRemote();
    window.addEventListener("pagehide", () => {
      for (const store of ALL_STORES)
        store.flush();
    });
  }
  function hasSummary(topicId) {
    return (Summaries.get(topicId)?.length ?? 0) > 0;
  }
  function addSummary(topicId, record) {
    Summaries.set(topicId, [record, ...Summaries.get(topicId) ?? []]);
    if (!Summarized.has(topicId))
      Summarized.set(topicId, true);
    dispatch("summaryUpdated", { topicId });
  }
  function addQuestion(topicId, record) {
    Questions.set(topicId, [record, ...Questions.get(topicId) ?? []]);
  }

  // src/api/Navigation.ts
  var logger3 = new Logger("Navigation");
  var TOPIC_PATH = /^\/t\/(?:[^/]+\/)?(\d+)(?:\/\d+)?\/?$/;
  var LIST_PATH = /^\/(?:$|latest|new|unread|unseen|top|hot|categories|bookmarks|c\/|tag\/|tags\/|u\/[^/]+\/(?:activity|summary|bookmarks))/;
  function parseRoute(href) {
    const url = new URL(href, "https://linux.do/");
    url.hash = "";
    const path = url.pathname;
    const topicMatch = path.match(TOPIC_PATH);
    const kind = topicMatch ? "topic" : path.startsWith("/search") ? "search" : LIST_PATH.test(path) ? "list" : "other";
    const topicId = topicMatch?.[1] ?? null;
    return {
      url: url.href,
      path,
      kind,
      topicId,
      searchQuery: kind === "search" ? (url.searchParams.get("q") ?? "").trim() : "",
      key: topicId ? `topic:${topicId}` : `${path}${url.search}`
    };
  }
  var current = null;
  function currentRoute() {
    const route = parseRoute(location.href);
    if (!current)
      current = route;
    return route;
  }
  function checkRoute() {
    const next = parseRoute(location.href);
    if (current && next.key === current.key) {
      current = next;
      return;
    }
    const previous = current;
    current = next;
    dispatch("navigate", { route: next, previous });
  }
  function discourseRouter() {
    const container = pageWindow.Discourse?.__container__;
    return container?.lookup("service:router");
  }
  function routeTo(path) {
    try {
      const router = discourseRouter();
      if (router?.transitionTo) {
        router.transitionTo(path);
        return;
      }
    } catch (error) {
      logger3.warn("站内跳转失败，改为整页加载", error);
    }
    location.assign(path);
  }
  function hookDiscourseRouter() {
    try {
      const router = discourseRouter();
      if (!router?.on)
        return false;
      router.on("routeDidChange", () => queueMicrotask(checkRoute));
      return true;
    } catch (error) {
      logger3.warn("无法挂接 Discourse 路由", error);
      return false;
    }
  }
  function startNavigation() {
    current = parseRoute(location.href);
    window.addEventListener("popstate", checkRoute);
    window.addEventListener("pageshow", checkRoute);
    if (hookDiscourseRouter())
      return;
    let tries = 0;
    const timer = setInterval(() => {
      if (hookDiscourseRouter() || ++tries > 20)
        clearInterval(timer);
    }, 500);
  }

  // src/utils/types.ts
  function definePlugin(plugin) {
    return plugin;
  }

  // src/utils/SettingsStore.ts
  var logger4 = new Logger("SettingsStore");
  var SAVE_DEBOUNCE_MS = 150;

  class SettingsStore {
    persist;
    plain;
    store;
    listeners = new Map;
    defaults = new Map;
    proxies = new WeakMap;
    saveTimer = null;
    ready = false;
    constructor(plain, persist) {
      this.persist = persist;
      this.plain = plain;
      this.store = this.wrap(plain, "");
    }
    markReady() {
      this.ready = true;
    }
    setDefaults(prefix, getter) {
      this.defaults.set(prefix, getter);
    }
    defaultFor(path) {
      const dot = path.lastIndexOf(".");
      return dot < 0 ? undefined : this.defaults.get(path.slice(0, dot))?.(path.slice(dot + 1));
    }
    subscribe(prefix, listener) {
      let set = this.listeners.get(prefix);
      if (!set)
        this.listeners.set(prefix, set = new Set);
      set.add(listener);
      return () => {
        set.delete(listener);
        if (!set.size)
          this.listeners.delete(prefix);
      };
    }
    replaceAll(next, notify = true) {
      for (const key of Object.keys(this.plain))
        delete this.plain[key];
      Object.assign(this.plain, next);
      if (notify)
        this.notify("");
    }
    flush() {
      if (this.saveTimer)
        clearTimeout(this.saveTimer);
      this.saveTimer = null;
      if (this.ready)
        this.persist(this.plain);
    }
    notify(path) {
      for (const [prefix, set] of Array.from(this.listeners)) {
        if (!(path.startsWith(prefix) || prefix.startsWith(path)))
          continue;
        for (const listener of Array.from(set)) {
          try {
            listener(path);
          } catch (error) {
            logger4.error("设置监听器出错", error);
          }
        }
      }
      if (!this.ready || this.saveTimer)
        return;
      this.saveTimer = setTimeout(() => this.flush(), SAVE_DEBOUNCE_MS);
    }
    wrap(target, path) {
      const cached = this.proxies.get(target);
      if (cached)
        return cached;
      const proxy = new Proxy(target, {
        get: (t, key) => {
          if (typeof key !== "string")
            return Reflect.get(t, key);
          const full = path ? `${path}.${key}` : key;
          let value = t[key];
          if (value === undefined)
            value = this.defaultFor(full);
          return isObject(value) || Array.isArray(value) ? this.wrap(value, full) : value;
        },
        set: (t, key, value) => {
          if (typeof key !== "string")
            return Reflect.set(t, key, value);
          if (Object.is(t[key], value))
            return true;
          t[key] = value;
          this.notify(path ? `${path}.${key}` : key);
          return true;
        },
        deleteProperty: (t, key) => {
          if (typeof key !== "string" || !(key in t))
            return true;
          delete t[key];
          this.notify(path ? `${path}.${key}` : key);
          return true;
        }
      });
      this.proxies.set(target, proxy);
      return proxy;
    }
  }

  // src/api/Settings.ts
  var logger5 = new Logger("Settings");
  var STORAGE_KEY = "LDPPSettings";
  var PlainSettings = { plugins: {} };
  var SettingsStore2 = new SettingsStore(PlainSettings, (plain) => gmSet(STORAGE_KEY, plain));
  var Settings = SettingsStore2.store;
  var pluginPath = (name, key) => key ? `plugins.${name}.${key}` : `plugins.${name}`;
  function parseBag(raw) {
    let value = raw;
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        return null;
      }
    }
    if (!isObject(value) || !isObject(value.plugins))
      return null;
    return value;
  }
  function initSettings() {
    const stored = parseBag(gmGet(STORAGE_KEY, null));
    if (stored)
      SettingsStore2.replaceAll({ plugins: stored.plugins }, false);
    SettingsStore2.markReady();
    gmOnRemoteChange(STORAGE_KEY, (value) => {
      const next = parseBag(value);
      if (!next)
        return;
      logger5.info("设置已在其他标签页更新");
      SettingsStore2.replaceAll({ plugins: next.plugins });
    });
    window.addEventListener("pagehide", () => SettingsStore2.flush());
  }
  function resolveDefault(def) {
    if (def.type === 3 /* SELECT */ && def.default === undefined) {
      const options = typeof def.options === "function" ? def.options() : def.options;
      return options.find((option) => option.default)?.value ?? options[0]?.value;
    }
    const value = def.default;
    return value !== null && typeof value === "object" ? structuredClone(value) : value;
  }
  function definePluginSettings(def) {
    let name = "";
    return {
      def,
      get store() {
        if (!name)
          throw new Error("插件尚未注册，无法读取设置");
        PlainSettings.plugins[name] ??= {};
        return Settings.plugins[name];
      },
      get pluginName() {
        return name;
      },
      set pluginName(value) {
        name = value;
        SettingsStore2.setDefaults(pluginPath(value), (key) => (key in def) ? resolveDefault(def[key]) : undefined);
      },
      reset(key) {
        const bag = Settings.plugins[name];
        if (bag)
          delete bag[key];
      }
    };
  }
  function mergePluginSettings(name, patch) {
    Settings.plugins[name] = { ...PlainSettings.plugins[name], ...patch };
  }
  function onSettingsChange(prefix, listener) {
    return SettingsStore2.subscribe(prefix, listener);
  }

  // src/api/PluginManager.ts
  var logger6 = new Logger("PluginManager", "#b4befe");
  var plugins = {};
  var cleanups = new Map;
  function registerPlugin(plugin) {
    if (plugins[plugin.name])
      return;
    plugin.started = false;
    plugins[plugin.name] = plugin;
    if (plugin.settings)
      plugin.settings.pluginName = plugin.name;
  }
  function isPluginEnabled(name) {
    const plugin = plugins[name];
    if (!plugin)
      return false;
    if (plugin.required)
      return true;
    return PlainSettings.plugins[name]?.enabled ?? plugin.enabledByDefault ?? false;
  }
  function runCleanups(name) {
    for (const fn of cleanups.get(name) ?? []) {
      try {
        fn();
      } catch (error) {
        logger6.error(`${name} 清理出错`, error);
      }
    }
    cleanups.delete(name);
  }
  function startPlugin(plugin) {
    if (plugin.started)
      return true;
    for (const dep of plugin.dependencies ?? []) {
      const target = plugins[dep];
      if (!target) {
        logger6.error(`${plugin.name} 缺少依赖 ${dep}`);
        return false;
      }
      if (!isPluginEnabled(dep))
        mergePluginSettings(dep, { enabled: true });
      if (!startPlugin(target))
        return false;
    }
    const unsubs = [];
    cleanups.set(plugin.name, unsubs);
    try {
      if (plugin.managedStyle)
        enableStyle(plugin.managedStyle);
      plugin.start?.();
      for (const [event, handler] of Object.entries(plugin.events ?? {})) {
        if (handler)
          unsubs.push(subscribe(event, handler));
      }
      if (plugin.onSettingsChange) {
        const handler = plugin.onSettingsChange.bind(plugin);
        unsubs.push(onSettingsChange(pluginPath(plugin.name), handler));
      }
      plugin.started = true;
      if (!plugin.hidden)
        logger6.info(`已启动 ${plugin.name}`);
      return true;
    } catch (error) {
      logger6.error(`启动 ${plugin.name} 失败`, error);
      runCleanups(plugin.name);
      if (plugin.managedStyle)
        disableStyle(plugin.managedStyle);
      return false;
    }
  }
  function stopPlugin(plugin) {
    if (!plugin.started || plugin.required)
      return !plugin.started;
    for (const other of Object.values(plugins)) {
      if (other.started && other.dependencies?.includes(plugin.name))
        stopPlugin(other);
    }
    try {
      plugin.stop?.();
    } catch (error) {
      logger6.error(`停止 ${plugin.name} 出错`, error);
    }
    runCleanups(plugin.name);
    if (plugin.managedStyle)
      disableStyle(plugin.managedStyle);
    plugin.started = false;
    return true;
  }
  function requirementsOf(name, out = new Set) {
    for (const dep of plugins[name]?.dependencies ?? []) {
      if (out.has(dep))
        continue;
      out.add(dep);
      requirementsOf(dep, out);
    }
    return out;
  }
  function dependentsOf(name, out = new Set) {
    for (const other of Object.values(plugins)) {
      if (out.has(other.name) || !other.dependencies?.includes(name))
        continue;
      out.add(other.name);
      dependentsOf(other.name, out);
    }
    return out;
  }
  function setPluginEnabled(name, enabled) {
    const plugin = plugins[name];
    if (!plugin || plugin.required)
      return;
    const related = enabled ? requirementsOf(name) : dependentsOf(name);
    const changed = [...related].filter((other) => !plugins[other].required && isPluginEnabled(other) !== enabled);
    for (const other of [...changed, name])
      mergePluginSettings(other, { enabled });
    if (enabled)
      startPlugin(plugin);
    else
      stopPlugin(plugin);
    for (const other of [...changed, name])
      dispatch("pluginToggle", { name: other, enabled });
  }
  function startAllPlugins(target) {
    for (const plugin of Object.values(plugins)) {
      if ((plugin.startAt ?? "DOMContentLoaded" /* DOMContentLoaded */) !== target || !isPluginEnabled(plugin.name))
        continue;
      startPlugin(plugin);
    }
  }

  // src/utils/dom.ts
  var SVG_NS = "http://www.w3.org/2000/svg";
  var LDPP_ATTR = "data-ldpp";
  function applyProps(el, props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined)
        continue;
      switch (key) {
        case "class":
          el.setAttribute("class", String(value));
          break;
        case "style":
          for (const [prop, val] of Object.entries(value))
            el.style.setProperty(prop, val);
          break;
        case "dataset":
          Object.assign(el.dataset, value);
          break;
        case "attrs":
          for (const [name, val] of Object.entries(value)) {
            if (val == null || val === false)
              el.removeAttribute(name);
            else
              el.setAttribute(name, val === true ? "" : String(val));
          }
          break;
        case "on":
          for (const [type, handler] of Object.entries(value))
            el.addEventListener(type, handler);
          break;
        default:
          el[key] = value;
      }
    }
  }
  function append(parent, ...children) {
    for (const child of children) {
      if (child == null || child === false)
        continue;
      if (Array.isArray(child))
        append(parent, ...child);
      else
        parent.appendChild(typeof child === "object" ? child : document.createTextNode(String(child)));
    }
  }
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    if (props)
      applyProps(el, props);
    append(el, ...children);
    return el;
  }
  function svg(viewBox, inner, size = 16) {
    const root = document.createElementNS(SVG_NS, "svg");
    root.setAttribute("viewBox", viewBox);
    root.setAttribute("width", String(size));
    root.setAttribute("height", String(size));
    root.setAttribute("aria-hidden", "true");
    root.setAttribute("focusable", "false");
    for (const [tag, attrs] of inner) {
      const node = document.createElementNS(SVG_NS, tag);
      for (const [name, value] of Object.entries(attrs))
        node.setAttribute(name, value);
      root.appendChild(node);
    }
    return root;
  }
  function mark(el, owner) {
    el.setAttribute(LDPP_ATTR, owner);
    return el;
  }
  function isOwnNode(node) {
    const el = node instanceof Element ? node : node?.parentElement;
    return Boolean(el?.closest(`[${LDPP_ATTR}]`));
  }
  function trackScrollbar(el) {
    let shown = false;
    const observer = new ResizeObserver(() => {
      if (el.isConnected)
        shown = true;
      else if (shown)
        return observer.disconnect();
      el.style.setProperty("--ldpp-scrollbar", `${el.offsetWidth - el.clientWidth}px`);
    });
    observer.observe(el);
    return el;
  }
  function setClass(el, name, on) {
    if (el.classList.contains(name) !== on)
      el.classList.toggle(name, on);
  }
  function onReady(fn) {
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    else
      fn();
  }

  // src/utils/text.ts
  var WS = /\s+/g;
  var REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;
  function normalizeText(value) {
    return value == null ? "" : String(value).replace(WS, " ").trim();
  }
  function escapeRegExp(value) {
    return value.replace(REGEX_SPECIALS, "\\$&");
  }
  function applyEdits(value, edits) {
    const hits = edits.map((edit, index) => ({ index, at: edit.from ? value.indexOf(edit.from) : -1 })).filter((hit) => hit.at >= 0).toSorted((a, b) => a.at - b.at);
    const placed = [];
    let text = "";
    let cursor = 0;
    for (const { index, at } of hits) {
      if (at < cursor)
        continue;
      text += value.slice(cursor, at);
      placed.push({ edit: index, start: text.length });
      text += edits[index].to;
      cursor = at + edits[index].from.length;
    }
    return { text: text + value.slice(cursor), placed };
  }
  function visualWidth(value) {
    let width = 0;
    for (const char of value)
      width += (char.codePointAt(0) ?? 0) > 255 ? 2 : 1;
    return width;
  }
  function truncateVisual(value, maxWidth) {
    const text = normalizeText(value);
    if (visualWidth(text) <= maxWidth)
      return text;
    let width = 0;
    let out = "";
    for (const char of text) {
      const next = (char.codePointAt(0) ?? 0) > 255 ? 2 : 1;
      if (width + next > maxWidth - 1)
        break;
      out += char;
      width += next;
    }
    return `${out}…`;
  }
  function splitList(value) {
    const seen = new Set;
    const out = [];
    for (const part of value.split(/[,，\n]/)) {
      const item = part.trim();
      const key = item.toLowerCase();
      if (!item || seen.has(key))
        continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }
  function formatTime(iso) {
    const time = Date.parse(iso);
    return Number.isFinite(time) ? new Date(time).toLocaleString() : "未知时间";
  }

  // src/api/Discourse.ts
  class DiscourseError extends Error {
    status;
    code;
    constructor(message, status, code) {
      super(message);
      this.status = status;
      this.code = code;
      this.name = "DiscourseError";
    }
  }
  var BASE_DELAY_SECONDS = 10;
  var CHUNK = 100;
  var titleCache = new Map;
  var titleRequests = new Map;
  function headers() {
    const out = {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      "Discourse-Present": "true"
    };
    const csrf = document.querySelector("meta[name='csrf-token']")?.content;
    if (csrf)
      out["X-CSRF-Token"] = csrf;
    return out;
  }
  async function discourseJson(path, { signal, retries = 3, onRetry } = {}) {
    for (let attempt = 0;; attempt++) {
      const res = await fetch(new URL(path, location.origin).href, { credentials: "include", headers: headers(), signal: signal ?? undefined });
      if (res.status === 429) {
        if (attempt >= retries)
          throw new DiscourseError(`linux.do 接口限流（429），已重试 ${retries} 次`, 429, "RATE_LIMITED");
        const retryAfter = Number(res.headers.get("retry-after"));
        const delaySeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : BASE_DELAY_SECONDS * 2 ** attempt;
        onRetry?.({ attempt: attempt + 1, total: retries, delaySeconds });
        await sleep(delaySeconds * 1000, signal);
        continue;
      }
      if (!res.ok)
        throw new DiscourseError(`linux.do 接口返回 HTTP ${res.status}`, res.status, "HTTP_ERROR");
      const json = await res.json().catch(() => null);
      if (!isObject(json))
        throw new DiscourseError("linux.do 接口返回了无法解析的内容", res.status, "BAD_RESPONSE");
      return json;
    }
  }
  async function fetchTopic(topicId, options) {
    const topic = await discourseJson(`/t/${encodeURIComponent(topicId)}.json`, options);
    if (topic.title)
      titleCache.set(topicId, normalizeText(topic.title));
    return topic;
  }
  async function fetchAllPosts(topicId, options) {
    const topic = await fetchTopic(topicId, options);
    const loaded = new Map(topic.post_stream.posts.map((post) => [post.id, post]));
    const missing = (topic.post_stream.stream ?? []).filter((id) => !loaded.has(id));
    for (let index = 0;index < missing.length; index += CHUNK) {
      const ids = missing.slice(index, index + CHUNK);
      const query = ids.map((id) => `post_ids[]=${id}`).join("&");
      const chunk = await discourseJson(`/t/${encodeURIComponent(topicId)}/posts.json?${query}&include_suggested=false`, options);
      for (const post of chunk.post_stream?.posts ?? [])
        loaded.set(post.id, post);
    }
    const order = topic.post_stream.stream ?? Array.from(loaded.keys());
    const posts = order.map((id) => loaded.get(id)).filter((post) => Boolean(post));
    return { title: normalizeText(topic.title), posts };
  }
  function rememberTopicTitle(topicId, title) {
    const text = normalizeText(title);
    if (text)
      titleCache.set(topicId, text);
  }
  function resolveTopicTitle(topicId) {
    const cached = titleCache.get(topicId);
    if (cached)
      return Promise.resolve(cached);
    let request = titleRequests.get(topicId);
    if (!request) {
      request = fetchTopic(topicId, { retries: 0 }).then((topic) => normalizeText(topic.title), () => "").finally(() => titleRequests.delete(topicId));
      titleRequests.set(topicId, request);
    }
    return request;
  }

  // src/api/TopicList.ts
  var logger7 = new Logger("TopicList", "#94e2d5");
  var ROW_SELECTOR = "tr.topic-list-item";
  var TITLE_SELECTOR = "a.title, a.raw-topic-link";
  var TOPIC_HREF = /\/t\/(?:[^/?#]+\/)?(\d+)/;
  var rows = new WeakMap;
  var applied = new WeakMap;
  var internalText = new WeakMap;
  var filters = new Map;
  var decorators = new Map;
  var processors = new Map;
  var titleOverrides = new Map;
  var highlightNames = new Set;
  var titlePreviews = new Set;
  var titleMarks = new Map;
  var appliedMarks = new WeakMap;
  var passListeners = new Set;
  var current2 = [];
  var revealHidden = false;
  var observer = null;
  var observedRoot = null;
  var pending = false;
  var passCount = 0;
  function topicIdOf(el) {
    const direct = el.dataset.topicId ?? el.querySelector("[data-topic-id]")?.dataset.topicId;
    if (direct)
      return direct;
    return el.querySelector(TITLE_SELECTOR)?.getAttribute("href")?.match(TOPIC_HREF)?.[1] ?? "";
  }
  function titleHolder(el) {
    const anchor = el.querySelector(TITLE_SELECTOR);
    return anchor?.querySelector(":scope > span[dir]") ?? anchor ?? null;
  }
  function textNodes(holder) {
    const out = [];
    const walker = document.createTreeWalker(holder, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode();node; node = walker.nextNode())
      out.push(node);
    return out;
  }
  function readTitle(holder) {
    return normalizeText(holder.textContent);
  }
  function writeText(node, value) {
    internalText.set(node, value);
    node.nodeValue = value;
  }
  var overrideKey = (override) => typeof override === "string" ? override : `\x00${override.highlight}\x00${JSON.stringify(override.edits)}`;
  function highlightNamed(name) {
    if (!name || typeof Highlight === "undefined" || !globalThis.CSS?.highlights)
      return null;
    let highlight = CSS.highlights.get(name);
    if (!highlight) {
      highlight = new Highlight;
      CSS.highlights.set(name, highlight);
    }
    highlightNames.add(name);
    return highlight;
  }
  function dropApplied(el, holder) {
    const state = applied.get(el);
    if (!state)
      return;
    applied.delete(el);
    const highlight = highlightNamed(state.highlight);
    for (const range of state.ranges)
      highlight?.delete(range);
    if (holder) {
      setClass(holder, "ldpp-title-overridden", false);
      setClass(holder, "ldpp-title-edited", false);
    }
  }
  function restoreTitle(el, holder) {
    const state = applied.get(el);
    if (!state)
      return;
    dropApplied(el, holder);
    for (const [node, value] of state.stash)
      if (holder?.contains(node))
        writeText(node, value);
  }
  function applyEditsInPlace(nodes, edits) {
    const stash = [];
    const ranges = [];
    let remaining = edits.map((edit, index) => ({ edit, index }));
    for (const node of nodes) {
      if (!remaining.length)
        break;
      const value = node.nodeValue ?? "";
      const { text, placed } = applyEdits(value, remaining.map((item) => item.edit));
      if (!placed.length)
        continue;
      stash.push([node, value]);
      writeText(node, text);
      for (const { edit, start } of placed) {
        const { to, mark: span = [0, to.length] } = remaining[edit].edit;
        if (span[1] <= span[0] || typeof document.createRange !== "function")
          continue;
        const range = document.createRange();
        range.setStart(node, start + span[0]);
        range.setEnd(node, start + Math.min(span[1], to.length));
        ranges.push(range);
      }
      const used = new Set(placed.map((item) => item.edit));
      remaining = remaining.filter((_, index) => !used.has(index));
    }
    return { stash, ranges };
  }
  function applyTitle(el, holder, override) {
    restoreTitle(el, holder);
    const nodes = textNodes(holder).filter((node) => node.nodeValue?.trim());
    if (!nodes.length)
      return;
    const key = overrideKey(override);
    if (typeof override === "string") {
      const stash = nodes.map((node) => [node, node.nodeValue ?? ""]);
      writeText(nodes[0], override);
      for (const node of nodes.slice(1))
        writeText(node, "");
      holder.classList.add("ldpp-title-overridden");
      applied.set(el, { key, text: override, stash, ranges: [], highlight: "" });
      return;
    }
    const { stash, ranges } = applyEditsInPlace(nodes, override.edits);
    const highlight = highlightNamed(override.highlight);
    for (const range of ranges)
      highlight?.add(range);
    if (stash.length)
      holder.classList.add("ldpp-title-overridden", "ldpp-title-edited");
    applied.set(el, { key, text: readTitle(holder), stash, ranges, highlight: override.highlight });
  }
  function pruneHighlights() {
    for (const name of highlightNames) {
      const highlight = globalThis.CSS?.highlights?.get(name);
      highlight?.forEach((range) => {
        if (!range.startContainer.isConnected)
          highlight.delete(range);
      });
    }
  }
  function extract(el) {
    const id = topicIdOf(el);
    if (!id)
      return null;
    const holder = titleHolder(el);
    const domTitle = holder ? readTitle(holder) : "";
    let row = rows.get(el);
    if (!row || row.id !== id) {
      dropApplied(el, holder);
      row = {
        id,
        el,
        isBookmark: el.classList.contains("bookmark-list-item"),
        originalTitle: domTitle,
        category: "",
        categoryId: "",
        tags: [],
        hidden: false,
        verdicts: new Map
      };
      rows.set(el, row);
    } else {
      const state = applied.get(el);
      if (!state)
        row.originalTitle = domTitle;
      else if (domTitle !== normalizeText(state.text)) {
        dropApplied(el, holder);
        row.originalTitle = domTitle;
      }
    }
    rememberTopicTitle(id, row.originalTitle);
    const badge = el.querySelector(".badge-category__name");
    row.category = normalizeText(badge?.textContent);
    row.categoryId = el.querySelector("[data-category-id]")?.dataset.categoryId ?? "";
    const tagNames = Array.from(el.querySelectorAll(".discourse-tags [data-tag-name], a.discourse-tag"), (tag) => normalizeText(tag.dataset.tagName ?? tag.textContent));
    row.tags = Array.from(new Set(tagNames.filter(Boolean)));
    return row;
  }
  function presentMark(row, holder) {
    const desired = titleMarks.get(row.id) ?? "";
    const previous = appliedMarks.get(holder) ?? "";
    if (desired === previous)
      return;
    if (previous)
      holder.classList.remove(`ldpp-title-mark-${previous}`);
    if (desired) {
      holder.classList.add(`ldpp-title-mark-${desired}`);
      appliedMarks.set(holder, desired);
    } else {
      appliedMarks.delete(holder);
    }
  }
  function presentTitle(row) {
    const holder = titleHolder(row.el);
    if (!holder)
      return;
    presentMark(row, holder);
    const override = titleOverrides.get(row.id);
    const desired = override && !titlePreviews.has(row.id) ? override : null;
    const state = applied.get(row.el);
    if (!desired) {
      if (state)
        restoreTitle(row.el, holder);
      return;
    }
    if (state?.key !== overrideKey(desired))
      applyTitle(row.el, holder, desired);
  }
  function actionBar(row) {
    const existing = row.el.querySelector(":scope .ldpp-actions");
    if (existing)
      return existing;
    const host = row.el.querySelector(".link-bottom-line") ?? row.el.querySelector("td.main-link") ?? row.el.querySelector("td");
    if (!host)
      return null;
    const bar = mark(h("div", { class: "ldpp-actions" }), "actions");
    host.appendChild(bar);
    return bar;
  }
  function slotFor(bar, decorator) {
    const found = bar.querySelector(`:scope > [data-slot="${decorator.id}"]`);
    if (found)
      return found;
    const slot = h("span", { class: "ldpp-slot", dataset: { slot: decorator.id, order: String(decorator.order) } });
    const after = Array.from(bar.children).find((child) => Number(child.dataset.order) > decorator.order);
    bar.insertBefore(slot, after ?? null);
    return slot;
  }
  function decorate(row) {
    if (!decorators.size) {
      row.el.querySelector(":scope .ldpp-actions")?.remove();
      return;
    }
    const bar = actionBar(row);
    if (!bar)
      return;
    for (const slot of Array.from(bar.children)) {
      if (!decorators.has(slot.dataset.slot ?? ""))
        slot.remove();
    }
    for (const decorator of decorators.values()) {
      try {
        decorator.render(row, slotFor(bar, decorator));
      } catch (error) {
        logger7.error(`装饰器 ${decorator.id} 出错`, error);
      }
    }
  }
  function syncPanels(live) {
    for (const panel of Array.from(document.querySelectorAll("tr.ldpp-panel-row"))) {
      const owner = live.get(panel.dataset.topicId ?? "");
      if (!owner) {
        panel.remove();
        continue;
      }
      if (owner.nextElementSibling !== panel)
        owner.after(panel);
    }
  }
  function runPass() {
    pending = false;
    passCount++;
    checkRoute();
    const root = document.querySelector("#main-outlet") ?? document.body;
    if (root !== observedRoot)
      observe(root);
    const next = [];
    const live = new Map;
    for (const el of Array.from(root.querySelectorAll(ROW_SELECTOR))) {
      const row = extract(el);
      if (!row)
        continue;
      next.push(row);
      if (!live.has(row.id))
        live.set(row.id, el);
    }
    for (const row of next) {
      row.verdicts.clear();
      for (const filter of filters.values()) {
        const verdict = filter.test(row);
        if (verdict != null)
          row.verdicts.set(filter.id, verdict);
      }
      row.hidden = row.verdicts.size > 0;
      setClass(row.el, "ldpp-hidden", row.hidden && !revealHidden);
      setClass(row.el, "ldpp-revealed", row.hidden && revealHidden);
      presentTitle(row);
      decorate(row);
    }
    current2 = next;
    pruneHighlights();
    syncPanels(live);
    for (const processor of processors.values()) {
      try {
        processor.run(next);
      } catch (error) {
        logger7.error(`处理器 ${processor.id} 出错`, error);
      }
    }
    for (const listener of Array.from(passListeners)) {
      try {
        listener(next);
      } catch (error) {
        logger7.error("列表监听器出错", error);
      }
    }
  }
  function isInternal(mutation) {
    if (mutation.type === "characterData") {
      const node = mutation.target;
      if (internalText.get(node) === node.nodeValue)
        return true;
      return !node.parentElement?.closest(TITLE_SELECTOR);
    }
    if (isOwnNode(mutation.target))
      return true;
    const changed = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];
    return changed.length > 0 && changed.every((node) => node instanceof Element ? node.hasAttribute("data-ldpp") || node.matches("tr.ldpp-panel-row") : node.nodeType === Node.TEXT_NODE && internalText.has(node));
  }
  function observe(root) {
    observer?.disconnect();
    observedRoot = root;
    observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => !isInternal(mutation)))
        schedule();
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
  }
  function schedule() {
    if (pending)
      return;
    pending = true;
    if (typeof requestAnimationFrame === "function" && document.visibilityState !== "hidden")
      requestAnimationFrame(runPass);
    else
      setTimeout(runPass, 16);
  }
  function flushNow() {
    runPass();
  }
  function startTopicList() {
    schedule();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible")
        schedule();
    });
  }
  function registerFilter(filter) {
    filters.set(filter.id, filter);
    schedule();
  }
  function unregisterFilter(id) {
    if (filters.delete(id))
      schedule();
  }
  function registerDecorator(decorator) {
    decorators.set(decorator.id, decorator);
    schedule();
  }
  function unregisterDecorator(id) {
    if (!decorators.delete(id))
      return;
    for (const slot of Array.from(document.querySelectorAll(`.ldpp-actions > [data-slot="${id}"]`)))
      slot.remove();
    schedule();
  }
  function registerProcessor(processor) {
    processors.set(processor.id, processor);
    schedule();
  }
  function unregisterProcessor(id) {
    processors.delete(id);
  }
  function onPass(listener) {
    passListeners.add(listener);
    return () => passListeners.delete(listener);
  }
  function setTitleOverride(topicId, title) {
    if (title && (typeof title === "string" || title.edits.length))
      titleOverrides.set(topicId, title);
    else
      titleOverrides.delete(topicId);
    for (const row of rowsForTopic(topicId))
      presentTitle(row);
  }
  function setTitleMark(topicId, name) {
    if (name)
      titleMarks.set(topicId, name);
    else
      titleMarks.delete(topicId);
    for (const row of rowsForTopic(topicId))
      presentTitle(row);
  }
  function setTitlePreview(topicId, previewing) {
    if (previewing)
      titlePreviews.add(topicId);
    else
      titlePreviews.delete(topicId);
    for (const row of rowsForTopic(topicId))
      presentTitle(row);
  }
  function displayedTitle(row) {
    const override = titleOverrides.get(row.id);
    if (override === undefined)
      return row.originalTitle;
    return typeof override === "string" ? override : applyEdits(row.originalTitle, override.edits).text;
  }
  function setRevealHidden(value) {
    revealHidden = value;
    for (const row of current2) {
      setClass(row.el, "ldpp-hidden", row.hidden && !revealHidden);
      setClass(row.el, "ldpp-revealed", row.hidden && revealHidden);
    }
  }
  function isRevealHidden() {
    return revealHidden;
  }
  function getRows() {
    return current2.filter((row) => row.el.isConnected);
  }
  function visibleRows() {
    return current2.filter((row) => row.el.isConnected && (!row.hidden || revealHidden));
  }
  function rowsForTopic(topicId) {
    return current2.filter((row) => row.id === topicId && row.el.isConnected);
  }
  function flashRow(row) {
    row.el.classList.remove("ldpp-flash");
    row.el.offsetWidth;
    row.el.classList.add("ldpp-flash");
    setTimeout(() => row.el.classList.remove("ldpp-flash"), 1600);
  }
  function focusTopic(topicId, view = "summary") {
    const event = { topicId, view, handled: false };
    dispatch("focusTopic", event);
    if (event.handled)
      return;
    const row = rowsForTopic(topicId).find((item) => !item.hidden);
    if (row) {
      row.el.scrollIntoView({ block: "center", behavior: "smooth" });
      flashRow(row);
      return;
    }
    if (currentRoute().topicId === topicId)
      return;
    routeTo(`/t/topic/${topicId}`);
  }
  function getPanelRow(row, create) {
    const next = row.el.nextElementSibling;
    if (next?.matches("tr.ldpp-panel-row") && next.dataset.topicId === row.id)
      return next.querySelector(".ldpp-panel");
    if (!create)
      return null;
    const panel = h("div", { class: "ldpp-panel" });
    const tr = h("tr", { class: "ldpp-panel-row", dataset: { topicId: row.id } }, h("td", { colSpan: Math.max(1, row.el.cells.length) }, panel));
    mark(tr, "panel");
    row.el.after(tr);
    return panel;
  }
  function removePanelRow(topicId) {
    for (const tr of Array.from(document.querySelectorAll(`tr.ldpp-panel-row[data-topic-id="${CSS.escape(topicId)}"]`)))
      tr.remove();
  }
  function getPassCount() {
    return passCount;
  }

  // src/api/Http.ts
  var DEFAULT_TIMEOUT = 120000;
  var CONTENT_TYPE = /^content-type:\s*([^\r\n]+)/im;
  var hasGMRequest = () => typeof globalThis.GM_xmlhttpRequest === "function";
  function viaGM(req) {
    return new Promise((resolve, reject) => {
      if (req.signal?.aborted)
        return reject(abortError());
      const handle = GM_xmlhttpRequest({
        method: req.method ?? "GET",
        url: req.url,
        headers: req.headers,
        data: req.body,
        responseType: req.responseType === "arraybuffer" ? "arraybuffer" : "text",
        timeout: req.timeout ?? DEFAULT_TIMEOUT,
        anonymous: req.credentials === "omit",
        onload: (res) => {
          req.signal?.removeEventListener("abort", onAbort);
          const isBuffer = req.responseType === "arraybuffer";
          resolve({
            status: res.status,
            ok: res.status >= 200 && res.status < 300,
            text: isBuffer ? "" : res.responseText ?? "",
            buffer: isBuffer ? res.response : null,
            contentType: res.responseHeaders?.match(CONTENT_TYPE)?.[1]?.trim() ?? ""
          });
        },
        onerror: () => reject(new Error(`网络请求失败：${req.url}`)),
        ontimeout: () => reject(new Error(`请求超时：${req.url}`)),
        onabort: () => reject(abortError())
      });
      const onAbort = () => handle?.abort();
      req.signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
  async function viaFetch(req) {
    const controller = new AbortController;
    const timer = setTimeout(() => controller.abort(), req.timeout ?? DEFAULT_TIMEOUT);
    const relay = () => controller.abort();
    req.signal?.addEventListener("abort", relay, { once: true });
    try {
      const res = await fetch(req.url, {
        method: req.method ?? "GET",
        headers: req.headers,
        body: req.body,
        credentials: req.credentials ?? "omit",
        signal: controller.signal
      });
      const isBuffer = req.responseType === "arraybuffer";
      return {
        status: res.status,
        ok: res.ok,
        text: isBuffer ? "" : await res.text(),
        buffer: isBuffer ? await res.arrayBuffer() : null,
        contentType: res.headers.get("content-type") ?? ""
      };
    } catch (error) {
      if (req.signal?.aborted)
        throw abortError();
      throw error;
    } finally {
      clearTimeout(timer);
      req.signal?.removeEventListener("abort", relay);
    }
  }
  function httpRequest(req) {
    return hasGMRequest() ? viaGM(req) : viaFetch(req);
  }

  // src/api/AI.ts
  class AIError extends Error {
    code;
    retryable;
    details;
    constructor(message, code, retryable, details = "") {
      super(message);
      this.code = code;
      this.retryable = retryable;
      this.details = details;
      this.name = "AIError";
    }
  }
  var DETAILS = ["auto", "low", "high"];
  var NON_RETRYABLE_STATUS = new Set([400, 401, 403, 404, 422]);
  var DEFAULT_PROFILE = {
    name: "默认配置",
    url: "https://api.openai.com/v1/chat/completions",
    key: "",
    model: "gpt-4o-mini",
    retryCount: 3,
    retryInterval: 6,
    imageInput: false,
    imageDetail: "auto",
    maxImages: 6,
    maxImageMB: 4,
    maxTotalImageMB: 12
  };
  function normalizeProfile(raw) {
    const source = isObject(raw) ? raw : {};
    const detail = asString(source.imageDetail);
    return {
      id: asString(source.id) || randomId("ai-"),
      name: asString(source.name) || DEFAULT_PROFILE.name,
      url: asString(source.url) || DEFAULT_PROFILE.url,
      key: asString(source.key),
      model: asString(source.model) || DEFAULT_PROFILE.model,
      retryCount: asInt(source.retryCount, DEFAULT_PROFILE.retryCount, 0, 10),
      retryInterval: asInt(source.retryInterval, DEFAULT_PROFILE.retryInterval, 1, 600),
      imageInput: source.imageInput === true,
      imageDetail: DETAILS.includes(detail) ? detail : "auto",
      maxImages: asInt(source.maxImages, DEFAULT_PROFILE.maxImages, 1, 20),
      maxImageMB: Math.min(20, Math.max(0.25, Number(source.maxImageMB) || DEFAULT_PROFILE.maxImageMB)),
      maxTotalImageMB: Math.min(60, Math.max(0.25, Number(source.maxTotalImageMB) || DEFAULT_PROFILE.maxTotalImageMB))
    };
  }
  var provider = { list: () => [], activeId: () => "" };
  function configureAI(next) {
    provider = next;
  }
  function getProfiles() {
    return provider.list();
  }
  function getProfile(id) {
    const profiles = provider.list();
    return profiles.find((profile) => profile.id === id) ?? profiles.find((profile) => profile.id === provider.activeId()) ?? profiles[0] ?? null;
  }
  function extractContent(json) {
    const choice = Array.isArray(json.choices) ? json.choices[0] : undefined;
    const message = isObject(choice?.message) ? choice.message : null;
    const content = message?.content;
    if (typeof content === "string" && content.trim())
      return content;
    if (Array.isArray(content)) {
      const text = content.map((part) => isObject(part) ? asString(part.text) : "").join("");
      if (text.trim())
        return text;
    }
    const reason = asString(choice?.finish_reason);
    if (reason.toLowerCase().includes("content_filter"))
      throw new AIError(`模型内容安全策略拦截（${reason}）`, "CONTENT_FILTER", false, JSON.stringify(json, null, 2).slice(0, 4000));
    throw new AIError("接口返回格式不是 OpenAI 兼容的 choices[0].message.content", "BAD_RESPONSE", true, JSON.stringify(json, null, 2).slice(0, 4000));
  }
  function requireProfile(profile) {
    if (!profile)
      throw new AIError("尚未配置 AI 接口", "NO_PROFILE", false);
    if (!profile.key)
      throw new AIError(`AI 配置「${profile.name}」没有填写 API Key`, "NO_KEY", false);
    return profile;
  }
  async function chat(target, messages, { signal } = {}) {
    const profile = requireProfile(target);
    let res;
    try {
      res = await httpRequest({
        method: "POST",
        url: profile.url,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${profile.key}` },
        body: JSON.stringify({ model: profile.model, messages, stream: false }),
        signal,
        credentials: "omit"
      });
    } catch (error) {
      if (isAbortError(error))
        throw error;
      throw new AIError(errorMessage(error), "NETWORK", true);
    }
    if (!res.ok)
      throw new AIError(`AI 接口返回 HTTP ${res.status}`, "HTTP", !NON_RETRYABLE_STATUS.has(res.status), res.text.slice(0, 4000));
    let json;
    try {
      json = JSON.parse(res.text);
    } catch {
      throw new AIError("AI 接口返回的不是 JSON", "BAD_RESPONSE", true, res.text.slice(0, 4000));
    }
    if (!isObject(json))
      throw new AIError("AI 接口返回的不是 JSON 对象", "BAD_RESPONSE", true, res.text.slice(0, 4000));
    return extractContent(json);
  }
  function isRetryable(error) {
    if (isAbortError(error))
      return false;
    if (error instanceof AIError)
      return error.retryable;
    return error?.retryable !== false;
  }
  async function chatWithRetry(profile, messages, { signal, onRetry } = {}) {
    const total = profile?.retryCount ?? 0;
    for (let attempt = 0;; attempt++) {
      try {
        return await chat(profile, messages, { signal });
      } catch (error) {
        if (attempt >= total || !isRetryable(error))
          throw error;
        onRetry?.({ attempt: attempt + 1, total, error });
        await sleep((profile?.retryInterval ?? 5) * 1000, signal);
      }
    }
  }
  function userContent(text, images) {
    if (!images.length)
      return text;
    return [{ type: "text", text }, ...images.map((image) => ({ type: "image_url", image_url: { url: image.url, detail: image.detail } }))];
  }
  function describeError(error) {
    const lines = [errorMessage(error)];
    if (error instanceof AIError && error.details)
      lines.push(error.details);
    if (error instanceof Error && error.stack && false)
      ;
    return lines.join(`

`);
  }

  // src/components/icons.ts
  var STROKE = { fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" };
  function stroke(...shapes) {
    return (size = 16) => {
      const icon = svg("0 0 24 24", shapes.map(([tag, attrs]) => [tag, { ...STROKE, ...attrs }]), size);
      icon.classList.add("ldpp-icon");
      return icon;
    };
  }
  function filled(viewBox, className, shapes) {
    return (size = 16) => {
      const icon = svg(viewBox, shapes, size);
      icon.classList.add("ldpp-icon", className);
      return icon;
    };
  }
  var path = (d) => ["path", { d }];
  var circle = (cx, cy, r) => ["circle", { cx: String(cx), cy: String(cy), r: String(r) }];
  var BanIcon = stroke(circle(12, 12, 9), path("M5.6 5.6l12.8 12.8"));
  var EyeIcon = stroke(path("M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"), circle(12, 12, 3));
  var EyeOffIcon = stroke(path("M3 3l18 18"), path("M10.6 6.1A9.8 9.8 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.9"), path("M6.6 6.7C3.9 8.5 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-.9"), path("M9.9 9.9a3 3 0 0 0 4.2 4.2"));
  var SparkIcon = stroke(path("M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"), path("M19 17v4"), path("M17 19h4"));
  var HistoryIcon = stroke(path("M3 12a9 9 0 1 0 3-6.7L3 8"), path("M3 3v5h5"), path("M12 7v5l3 2"));
  var ASK_PATH = { fill: "currentColor", stroke: "currentColor", "stroke-width": "0.5", "stroke-linejoin": "round" };
  var QuestionIcon = filled("0 0 32 32", "ldpp-ask-icon", [
    ["path", { ...ASK_PATH, d: "M17,23h-2v-2h2V23z M17,17.899c2.279-0.464,4-2.485,4-4.899c0-2.757-2.243-5-5-5s-5,2.243-5,5h2c0-1.654,1.346-3,3-3s3,1.346,3,3s-1.346,3-3,3h-1v4h2V17.899z" }],
    ["path", { ...ASK_PATH, d: "M16,2C8.268,2,2,8.268,2,16c0,2.863,0.863,5.522,2.338,7.74L2,29l1,1l5.26-2.338C10.478,29.137,13.137,30,16,30c7.732,0,14-6.268,14-14S23.732,2,16,2z M16,28.923c-2.551,0-5.021-0.746-7.144-2.158l-0.493-0.328l-5.042,2.241l2.241-5.042l-0.328-0.493C3.823,21.021,3.077,18.551,3.077,16C3.077,8.874,8.874,3.077,16,3.077c7.126,0,12.923,5.797,12.923,12.923S23.126,28.923,16,28.923z" }]
  ]);
  var DeArrowIcon = filled("0 0 36 36", "ldpp-dearrow-icon", [
    ["path", { fill: "#1213BD", d: "M36 18.302c0 4.981-2.46 9.198-5.655 12.462s-7.323 5.152-12.199 5.152-9.764-1.112-12.959-4.376S0 23.283 0 18.302s2.574-9.38 5.769-12.644S13.271 0 18.146 0s9.394 2.178 12.589 5.442C33.931 8.706 36 13.322 36 18.302z" }],
    ["path", { fill: "#88c9f9", d: "m 30.394282,18.410186 c 0,3.468849 -1.143025,6.865475 -3.416513,9.137917 -2.273489,2.272442 -5.670115,2.92874 -9.137918,2.92874 -3.467803,0 -6.373515,-1.147212 -8.6470033,-3.419654 -2.2734888,-2.272442 -3.5871299,-5.178154 -3.5871299,-8.647003 0,-3.46885 0.9420533,-6.746149 3.2144954,-9.0196379 2.2724418,-2.2734888 5.5507878,-3.9513905 9.0196378,-3.9513905 3.46885,0 6.492841,1.9322561 8.76633,4.204698 2.273489,2.2724424 3.788101,5.2974804 3.788101,8.7663304 z" }],
    ["path", { fill: "#0a62a5", d: "m 23.95823,17.818306 c 0,3.153748 -2.644888,5.808102 -5.798635,5.808102 -3.153748,0 -5.599825,-2.654354 -5.599825,-5.808102 0,-3.153747 2.446077,-5.721714 5.599825,-5.721714 3.153747,0 5.798635,2.567967 5.798635,5.721714 z" }]
  ]);
  var RefreshIcon = stroke(path("M21 12a9 9 0 0 1-15.4 6.4L3 16"), path("M3 21v-5h5"), path("M3 12a9 9 0 0 1 15.4-6.4L21 8"), path("M21 3v5h-5"));
  var CloseIcon = stroke(path("M6 6l12 12"), path("M18 6L6 18"));
  var ChevronLeftIcon = stroke(path("M15 6l-6 6 6 6"));
  var ChevronRightIcon = stroke(path("M9 6l6 6-6 6"));
  var ChevronDownIcon = stroke(path("M6 9l6 6 6-6"));
  var SettingsIcon = stroke(circle(12, 12, 3), path("M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"));
  var CopyIcon = stroke(["rect", { x: "9", y: "9", width: "12", height: "12", rx: "2" }], path("M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"));
  var TrashIcon = stroke(path("M3 6h18"), path("M8 6V4h8v2"), path("M19 6l-1 14H6L5 6"));
  var PlusIcon = stroke(path("M12 5v14"), path("M5 12h14"));
  var CloudIcon = stroke(path("M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 0 0 4.5 12 3.5 3.5 0 0 0 6 19z"));
  var FilterIcon = stroke(path("M3 5h18l-7 8v6l-4 2v-8z"));
  var ShieldIcon = stroke(path("M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"), path("M9 12l2 2 4-4"));
  var PluginIcon = stroke(path("m19 5 3-3"), path("m2 22 3-3"), path("M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"), path("M7.5 13.5 10 11"), path("M10.5 16.5 13 14"), path("m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"));
  var DatabaseIcon = stroke(["ellipse", { cx: "12", cy: "5", rx: "8", ry: "3" }], path("M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"), path("M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"));
  var BellIcon = stroke(path("M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"), path("M10.3 21a1.9 1.9 0 0 0 3.4 0"));
  var BotIcon = stroke(path("M12 8V4H8"), ["rect", { x: "4", y: "8", width: "16", height: "12", rx: "2" }], path("M2 14h2"), path("M20 14h2"), path("M15 13v2"), path("M9 13v2"));
  var InfoIcon = stroke(circle(12, 12, 9), path("M12 11v5"), path("M12 8h.01"));
  var ListIcon = stroke(path("M8 6h13"), path("M8 12h13"), path("M8 18h13"), path("M3 6h.01"), path("M3 12h.01"), path("M3 18h.01"));
  var SidebarIcon = stroke(["rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }], path("M15 4v16"));
  var SearchIcon = stroke(circle(11, 11, 7), path("M20 20l-3.5-3.5"));
  var STAR = "M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.53L12 17.49l-5.87 3.08 1.12-6.53L2.5 9.41l6.56-.95z";
  var PIN = "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z";
  var StarIcon = stroke(path(STAR));
  var StarFilledIcon = stroke(["path", { d: STAR, fill: "currentColor" }]);
  var PinIcon = stroke(path("M12 17v5"), path(PIN));
  var PinFilledIcon = stroke(path("M12 17v5"), ["path", { d: PIN, fill: "currentColor" }]);
  var SlidersIcon = stroke(path("M20 7h-9"), path("M14 17H5"), circle(17, 17, 3), circle(7, 7, 3));
  var dot = (cx, cy) => ["circle", { cx: String(cx), cy: String(cy), r: ".5", fill: "currentColor" }];
  var PaletteIcon = stroke(dot(13.5, 6.5), dot(17.5, 10.5), dot(8.5, 7.5), dot(6.5, 12.5), path("M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z"));
  var BracesIcon = stroke(path("M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"), path("M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"));
  var PencilIcon = stroke(path("M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"), path("m15 5 4 4"));
  var GlobeIcon = stroke(circle(12, 12, 10), path("M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"), path("M2 12h20"));
  var FolderIcon = stroke(path("M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"));
  var UploadIcon = stroke(path("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"), path("M17 8l-5-5-5 5"), path("M12 3v12"));
  var LinkIcon = stroke(path("M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"), path("M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"));
  var PanelLeftIcon = stroke(["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }], path("M9 3v18"));
  var MessageCircleIcon = stroke(path("M7.9 20A9 9 0 1 0 4 16.1L2 22Z"));
  var UserCircleIcon = stroke(circle(12, 12, 10), circle(12, 10, 3), path("M7 20.66V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.66"));
  var WideIcon = stroke(path("m18 8 4 4-4 4"), path("M2 12h20"), path("m6 8-4 4 4 4"));
  var ClockIcon = stroke(circle(12, 12, 10), path("M12 6v6l4 2"));
  var LanguagesIcon = stroke(path("m5 8 6 6"), path("m4 14 6-6 2-3"), path("M2 5h12"), path("M7 2h1"), path("m22 22-5-10-5 10"), path("M14 18h6"));
  var VideoOffIcon = stroke(path("M10.66 6H14a2 2 0 0 1 2 2v2.5l5.25-3.06A.5.5 0 0 1 22 7.87v8.196"), path("M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"), path("m2 2 20 20"));
  var ArrowUpIcon = stroke(path("m5 12 7-7 7 7"), path("M12 19V5"));
  var StopIcon = stroke(["rect", { x: "6", y: "6", width: "12", height: "12", rx: "2", fill: "currentColor" }]);
  var TagIcon = stroke(path("M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"), circle(7.5, 7.5, 0.5));
  var EraserIcon = stroke(path("m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"), path("M22 21H7"), path("m5 11 9 9"));

  // src/components/controls.ts
  function Button(label, { kind = "default", icon, title, small, disabled, onClick } = {}) {
    return h("button", {
      type: "button",
      class: classes("ldpp-btn", `ldpp-btn-${kind}`, small && "ldpp-btn-small"),
      title: title ?? "",
      disabled: Boolean(disabled),
      on: onClick ? { click: onClick } : undefined
    }, icon, label != null && label !== "" ? h("span", { class: "ldpp-btn-label" }, label) : null);
  }
  function IconButton(icon, { title, onClick, className, pressed }) {
    return h("button", {
      type: "button",
      class: classes("ldpp-icon-btn", className),
      title,
      attrs: { "aria-label": title, "aria-pressed": pressed == null ? null : String(pressed) },
      on: onClick ? { click: onClick } : undefined
    }, icon);
  }
  var FEEDBACK_ACTIVE_MS = 2250;
  var FEEDBACK_CLEANUP_MS = 2500;
  var feedbackTimers = new WeakMap;
  function flashFeedback(button, ok = true, label) {
    for (const id of feedbackTimers.get(button) ?? [])
      clearTimeout(id);
    const clearMarks = () => {
      for (const el of Array.from(button.querySelectorAll(":scope > .ldpp-feedback-svg, :scope > .ldpp-feedback-alert")))
        el.remove();
    };
    clearMarks();
    if (ok) {
      const check = svg("0 0 52 52", [["path", { d: "M13 26 l10 10 20 -20" }]], 20);
      check.classList.add("ldpp-feedback-svg");
      button.append(check);
    }
    if (label)
      button.append(h("span", { class: classes("ldpp-feedback-alert", ok ? "is-success" : "is-fail"), attrs: { role: "status" } }, label));
    button.classList.add("is-feedback-active", "is-feedback-transition");
    feedbackTimers.set(button, [
      window.setTimeout(() => button.classList.remove("is-feedback-active"), FEEDBACK_ACTIVE_MS),
      window.setTimeout(() => {
        button.classList.remove("is-feedback-transition");
        clearMarks();
      }, FEEDBACK_CLEANUP_MS)
    ]);
  }
  function copyWithFeedback(button, text) {
    return copyText(text).then(() => flashFeedback(button, true, "已复制"), () => flashFeedback(button, false, "复制失败"));
  }
  function Switch(checked, onChange, label) {
    const input = h("input", { type: "checkbox", checked, attrs: { role: "switch", "aria-label": label ?? null } });
    input.addEventListener("change", () => onChange(input.checked));
    return h("label", { class: "ldpp-switch" }, input, h("span", { class: "ldpp-switch-track" }));
  }
  function scrollParent(el) {
    for (let node = el.parentElement;node && node !== document.body; node = node.parentElement) {
      const overflow = getComputedStyle(node).overflowY;
      if (overflow === "auto" || overflow === "scroll")
        return node;
    }
    return null;
  }
  function autoGrow(area, maxHeight = () => Math.max(160, Math.round(window.innerHeight * 0.4))) {
    const fit = () => {
      if (!area.isConnected) {
        window.removeEventListener("resize", fit);
        return;
      }
      area.style.height = "auto";
      const full = area.scrollHeight + area.offsetHeight - area.clientHeight;
      let height = Math.min(full, maxHeight());
      area.style.height = `${height}px`;
      const outer = scrollParent(area);
      const overflow = outer ? outer.scrollHeight - outer.clientHeight : 0;
      if (overflow > 1 && height < full) {
        const shrunk = height - overflow;
        height = shrunk >= Math.min(full, 160) ? shrunk : full;
        area.style.height = `${height}px`;
      }
      area.style.overflowY = height < full ? "auto" : "hidden";
    };
    area.addEventListener("input", fit);
    window.addEventListener("resize", fit);
    let tries = 0;
    const settle = () => {
      if (area.isConnected)
        fit();
      else if (tries++ < 60)
        requestAnimationFrame(settle);
    };
    requestAnimationFrame(settle);
    return area;
  }
  function TextInput({ value, placeholder, multiline, rows = 2, secret, monospace, onChange, onInput }) {
    const className = classes("ldpp-input", monospace && "ldpp-mono");
    const input = multiline ? h("textarea", { class: className, value, placeholder: placeholder ?? "", rows, spellcheck: false }) : h("input", { class: className, type: secret ? "password" : "text", value, placeholder: placeholder ?? "", spellcheck: false, autocomplete: "off" });
    if (input instanceof HTMLTextAreaElement)
      autoGrow(input);
    if (onChange)
      input.addEventListener("change", () => onChange(input.value));
    if (onInput)
      input.addEventListener("input", () => onInput(input.value));
    if (!secret || multiline)
      return input;
    let revealed = false;
    const toggle = h("button", { type: "button", class: "ldpp-secret-toggle", title: "显示/隐藏" }, EyeIcon());
    toggle.addEventListener("click", () => {
      revealed = !revealed;
      input.type = revealed ? "text" : "password";
      toggle.replaceChildren(revealed ? EyeOffIcon() : EyeIcon());
    });
    return h("div", { class: "ldpp-secret" }, input, toggle);
  }
  function NumberInput({ value, min, max, step, unit, onChange }) {
    const input = h("input", { class: "ldpp-input ldpp-number", type: "number", value: String(value), min: min == null ? "" : String(min), max: max == null ? "" : String(max), step: String(step ?? 1) });
    input.addEventListener("change", () => {
      let next = Number(input.value);
      if (!Number.isFinite(next))
        next = value;
      if (min != null)
        next = Math.max(min, next);
      if (max != null)
        next = Math.min(max, next);
      input.value = String(next);
      onChange(next);
    });
    return unit ? h("span", { class: "ldpp-number-wrap" }, input, h("span", { class: "ldpp-unit" }, unit)) : input;
  }
  function Select(value, choices, onChange) {
    const select = h("select", { class: "ldpp-input ldpp-select" }, choices.map((choice) => h("option", { value: choice.value, selected: choice.value === value }, choice.label)));
    select.addEventListener("change", () => onChange(select.value));
    return select;
  }
  function Field(label, control, description) {
    return h("div", { class: "ldpp-field" }, h("div", { class: "ldpp-field-head" }, h("span", { class: "ldpp-field-label" }, label, description ? InfoTip(description) : null), control));
  }
  function StackField(label, control, description) {
    return h("div", { class: "ldpp-field ldpp-field-stack" }, h("span", { class: "ldpp-field-label" }, label, description ? InfoTip(description) : null), control);
  }
  function Section(title, ...children) {
    return h("section", { class: "ldpp-section" }, h("h3", { class: "ldpp-section-title" }, title), ...children);
  }
  function Hint(text, kind = "info") {
    return h("p", { class: classes("ldpp-hint", `ldpp-hint-${kind}`) }, text);
  }
  function InfoTip(text, { label = "说明", warning = false } = {}) {
    const popover = h("div", { class: "ldpp-infotip-pop", attrs: { role: "tooltip" } }, text);
    const button = h("button", {
      type: "button",
      class: classes("ldpp-infotip", warning && "is-warning"),
      title: label,
      attrs: { "aria-label": label, "aria-expanded": "false" }
    }, InfoIcon(15));
    let cleanup = null;
    const close = () => {
      cleanup?.();
      cleanup = null;
      popover.remove();
      button.setAttribute("aria-expanded", "false");
    };
    const place = () => {
      const rect = button.getBoundingClientRect();
      const width = popover.offsetWidth;
      const height = popover.offsetHeight;
      const left = Math.min(Math.max(rect.left, 8), window.innerWidth - width - 8);
      const below = rect.bottom + 6;
      popover.style.left = `${Math.round(left)}px`;
      popover.style.top = `${Math.round(below + height > window.innerHeight - 8 ? Math.max(8, rect.top - 6 - height) : below)}px`;
    };
    const open = () => {
      document.body.appendChild(mark(popover, "infotip"));
      button.setAttribute("aria-expanded", "true");
      place();
      const onPointer = (event) => {
        const target = event.target;
        if (!button.contains(target) && !popover.contains(target))
          close();
      };
      const onKey = (event) => {
        if (event.key !== "Escape")
          return;
        event.preventDefault();
        event.stopPropagation();
        close();
      };
      window.addEventListener("mousedown", onPointer, true);
      window.addEventListener("keydown", onKey, true);
      window.addEventListener("scroll", close, true);
      window.addEventListener("resize", close);
      cleanup = () => {
        window.removeEventListener("mousedown", onPointer, true);
        window.removeEventListener("keydown", onKey, true);
        window.removeEventListener("scroll", close, true);
        window.removeEventListener("resize", close);
      };
    };
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (popover.isConnected)
        close();
      else
        open();
    });
    return button;
  }
  function SubTabs(items) {
    const bar = h("div", { class: "ldpp-subtabs", attrs: { role: "tablist" } });
    const panel = h("div", { class: "ldpp-subtab-panel" });
    const buttons = items.map((item, index) => h("button", {
      type: "button",
      class: "ldpp-subtab",
      attrs: { role: "tab" },
      on: { click: () => select(index) }
    }, item.label()));
    const select = (index) => {
      buttons.forEach((button, i) => {
        button.classList.toggle("is-active", i === index);
        button.setAttribute("aria-selected", String(i === index));
      });
      panel.replaceChildren(items[index].render());
    };
    bar.append(...buttons);
    select(0);
    const refresh = () => buttons.forEach((button, i) => {
      const label = items[i].label();
      if (button.textContent !== label)
        button.textContent = label;
    });
    return { el: h("div", { class: "ldpp-subtabs-block" }, bar, panel), refresh };
  }
  function Tabs(tabs, { initial, vertical, onSelect } = {}) {
    const list = h("div", { class: classes("ldpp-tabs", vertical && "ldpp-tabs-vertical"), attrs: { role: "tablist" } });
    const panel = h("div", { class: "ldpp-tab-panel", attrs: { role: "tabpanel" } });
    const buttons = new Map;
    const select = (id) => {
      const tab = tabs.find((item) => item.id === id) ?? tabs[0];
      if (!tab)
        return;
      for (const [tabId, button] of buttons) {
        button.classList.toggle("is-active", tabId === tab.id);
        button.setAttribute("aria-selected", String(tabId === tab.id));
      }
      panel.replaceChildren(tab.render());
      onSelect?.(tab.id);
    };
    for (const tab of tabs) {
      const button = h("button", { type: "button", class: "ldpp-tab", attrs: { role: "tab" }, on: { click: () => select(tab.id) } }, tab.icon?.(), h("span", null, tab.label));
      buttons.set(tab.id, button);
      list.appendChild(button);
    }
    select(initial ?? tabs[0]?.id ?? "");
    return { list, panel, select };
  }

  // src/api/Dialog.ts
  var stack = [];
  var FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
  function onKeydown(event) {
    const top = stack.at(-1);
    if (!top)
      return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      top.close();
      return;
    }
    if (event.key !== "Tab")
      return;
    const items = Array.from(top.root.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (!items.length)
      return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  function openDialog({ title, icon, danger, info, back, body, actions = [], size = "medium", className, onClose }) {
    const previousFocus = document.activeElement;
    const content = h("div", { class: "ldpp-dialog-body" }, body);
    const footer = actions.length ? h("div", { class: "ldpp-dialog-footer" }) : null;
    const heading = h("h2", { class: "ldpp-dialog-title" }, icon, title, info ? InfoTip(info) : null);
    const box = h("div", { class: classes("ldpp-dialog", `ldpp-dialog-${size}`, danger && "is-danger", className), attrs: { role: "dialog", "aria-modal": "true", "aria-label": title, tabindex: "-1" } }, h("div", { class: "ldpp-dialog-header" }, back ? h("div", { class: "ldpp-dialog-heading" }, IconButton(ChevronLeftIcon(20), { title: back, className: "ldpp-dialog-back", onClick: () => handle.close() }), heading) : heading, IconButton(CloseIcon(18), { title: "关闭", onClick: () => back ? closeAllDialogs() : handle.close() })), content, footer);
    const below = stack.at(-1);
    const covers = size === "large" && below?.root.classList.contains("ldpp-dialog-large") === true;
    if (covers)
      below?.root.parentElement?.classList.add("is-covered");
    const overlay = mark(h("div", { class: classes("ldpp-dialog-overlay", stack.length > 0 && "is-nested") }, box), "dialog");
    overlay.addEventListener("mousedown", (event) => {
      if (event.target === overlay)
        handle.close();
    });
    let closed = false;
    const handle = {
      root: box,
      body: content,
      close() {
        if (closed)
          return;
        closed = true;
        overlay.remove();
        if (covers)
          below?.root.parentElement?.classList.remove("is-covered");
        stack.splice(stack.indexOf(handle), 1);
        if (!stack.length) {
          document.removeEventListener("keydown", onKeydown, true);
          document.documentElement.classList.remove("ldpp-dialog-open");
        }
        onClose?.();
        previousFocus?.focus?.({ preventScroll: true });
      },
      setBody(next) {
        content.replaceChildren();
        append(content, next);
      }
    };
    for (const action of actions) {
      const button = Button(action.label, {
        kind: action.kind ?? "default",
        onClick: async () => {
          button.disabled = true;
          try {
            const keepOpen = await action.onClick?.();
            if (keepOpen !== false)
              handle.close();
          } finally {
            button.disabled = false;
          }
        }
      });
      footer?.appendChild(button);
    }
    if (!stack.length) {
      document.addEventListener("keydown", onKeydown, true);
      document.documentElement.classList.add("ldpp-dialog-open");
    }
    stack.push(handle);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => box.focus({ preventScroll: true }));
    return handle;
  }
  function confirmDialog(message, { title = "请确认", okLabel = "确定", danger = false, icon } = {}) {
    return new Promise((resolve) => {
      let result = false;
      openDialog({
        title,
        icon: icon ?? (danger ? TrashIcon(18) : undefined),
        danger,
        size: "small",
        body: h("div", { class: "ldpp-confirm-text" }, message),
        actions: [
          { label: "取消" },
          { label: okLabel, kind: danger ? "danger" : "primary", onClick: () => {
            result = true;
          } }
        ],
        onClose: () => resolve(result)
      });
    });
  }
  function closeAllDialogs() {
    for (const dialog of stack.toReversed())
      dialog.close();
  }

  // src/plugins/_core/ai/index.ts
  var DEFAULT_ID = "default";
  var settings = definePluginSettings({
    profiles: {
      type: 6 /* CUSTOM */,
      default: [{ ...DEFAULT_PROFILE, id: DEFAULT_ID }]
    },
    activeProfile: {
      type: 6 /* CUSTOM */,
      default: DEFAULT_ID
    }
  });
  function listProfiles() {
    const raw = settings.store.profiles;
    const list = Array.isArray(raw) ? raw.map(normalizeProfile) : [];
    return list.length ? list : [{ ...DEFAULT_PROFILE, id: DEFAULT_ID }];
  }
  function saveProfiles(next) {
    settings.store.profiles = next.map((profile) => ({ ...profile }));
  }
  function profileChoices() {
    return listProfiles().map((profile) => ({ label: `${profile.name}（${profile.model}）`, value: profile.id }));
  }
  function uniqueName(stem, list) {
    const names = new Set(list.map((profile) => profile.name));
    for (let index = 1;; index++) {
      const name = index === 1 ? stem : `${stem} ${index}`;
      if (!names.has(name))
        return name;
    }
  }
  var copyName = (name, list) => uniqueName(`${name.replace(/\s*副本(?:\s*\d+)?$/, "")} 副本`, list);
  async function testProfile(profile, output) {
    output.replaceChildren(Hint("正在请求…"));
    const started = performance.now();
    try {
      const reply = await chat(profile, [{ role: "user", content: "请只回复：OK" }]);
      output.replaceChildren(Hint(`连接成功（${Math.round(performance.now() - started)}ms）：${reply.slice(0, 80)}`, "success"));
    } catch (error) {
      output.replaceChildren(Hint(h("pre", { class: "ldpp-pre" }, describeError(error)), "error"));
    }
  }
  function renderProfileEditor() {
    const root = h("div", { class: "ldpp-ai-editor" });
    let selected = settings.store.activeProfile;
    const render = () => {
      const list = listProfiles();
      const profile = list.find((item) => item.id === selected) ?? list[0];
      selected = profile.id;
      const update = (patch) => {
        saveProfiles(listProfiles().map((item) => item.id === profile.id ? normalizeProfile({ ...item, ...patch }) : item));
        if ("name" in patch || "model" in patch)
          render();
      };
      const testOutput = h("div", { class: "ldpp-ai-test" });
      const imageBox = h("div", { class: "ldpp-ai-images", hidden: !profile.imageInput }, Field("图片清晰度", Select(profile.imageDetail, [{ label: "auto", value: "auto" }, { label: "low", value: "low" }, { label: "high", value: "high" }], (value) => update({ imageDetail: value }))), Field("每次最多图片数", NumberInput({ value: profile.maxImages, min: 1, max: 20, onChange: (value) => update({ maxImages: value }) })), Field("单张上限", NumberInput({ value: profile.maxImageMB, min: 0.25, max: 20, step: 0.25, unit: "MB", onChange: (value) => update({ maxImageMB: value }) })), Field("总量上限", NumberInput({ value: profile.maxTotalImageMB, min: 0.25, max: 60, step: 0.25, unit: "MB", onChange: (value) => update({ maxTotalImageMB: value }) })));
      root.replaceChildren(Section(["接口配置", InfoTip("总结、提问默认使用「默认」配置；DeArrow 可在其设置中分别选择判断与改写所用的配置。API Key 仅保存在本地脚本存储中。")], Field("当前编辑", Select(profile.id, list.map((item) => ({ label: item.id === settings.store.activeProfile ? `${item.name}（默认）` : item.name, value: item.id })), (value) => {
        selected = value;
        render();
      })), h("div", { class: "ldpp-row-actions" }, Button("设为默认", { kind: "primary", small: true, disabled: profile.id === settings.store.activeProfile, onClick: () => {
        settings.store.activeProfile = profile.id;
        render();
      } }), Button("新建", { icon: PlusIcon(), small: true, onClick: () => {
        const created = normalizeProfile({ ...DEFAULT_PROFILE, id: randomId("ai-"), name: uniqueName("新配置", list) });
        saveProfiles([...list, created]);
        selected = created.id;
        render();
      } }), Button("复制", { icon: CopyIcon(), small: true, onClick: () => {
        const copy = normalizeProfile({ ...profile, id: randomId("ai-"), name: copyName(profile.name, list) });
        saveProfiles([...list, copy]);
        selected = copy.id;
        render();
      } }), Button("删除", { icon: TrashIcon(), kind: "delete", small: true, disabled: list.length <= 1, onClick: async () => {
        if (!await confirmDialog(`确定删除 AI 配置「${profile.name}」吗？`, { title: "删除 AI 配置", danger: true, okLabel: "删除" }))
          return;
        const rest = listProfiles().filter((item) => item.id !== profile.id);
        saveProfiles(rest);
        if (settings.store.activeProfile === profile.id)
          settings.store.activeProfile = rest[0].id;
        selected = settings.store.activeProfile;
        render();
      } })), Field("名称", TextInput({ value: profile.name, onChange: (value) => update({ name: value }) })), Field("接口地址", h("span", { class: "ldpp-field-wide" }, TextInput({ value: profile.url, placeholder: DEFAULT_PROFILE.url, onChange: (value) => update({ url: value }) })), "OpenAI 兼容的 Chat Completions 完整地址。"), Field("API Key", h("span", { class: "ldpp-field-wide" }, TextInput({ value: profile.key, secret: true, placeholder: "sk-...", onChange: (value) => update({ key: value }) }))), Field("模型", TextInput({ value: profile.model, onChange: (value) => update({ model: value }) })), Field("失败重试", h("span", { class: "ldpp-inline-controls" }, NumberInput({ value: profile.retryCount, min: 0, max: 10, unit: "次", onChange: (value) => update({ retryCount: value }) }), h("span", { class: "ldpp-muted" }, "间隔"), NumberInput({ value: profile.retryInterval, min: 1, max: 600, unit: "秒", onChange: (value) => update({ retryInterval: value }) }))), Field("图片输入", Switch(profile.imageInput, (value) => {
        update({ imageInput: value });
        imageBox.hidden = !value;
      }, "图片输入"), "把话题里的站内图片一起发给支持视觉的模型。"), imageBox, h("div", { class: "ldpp-row-actions" }, Button("测试连接", { kind: "primary", small: true, onClick: () => testProfile(listProfiles().find((item) => item.id === profile.id) ?? profile, testOutput) })), testOutput));
    };
    render();
    return root;
  }
  var ai_default = definePlugin({
    name: "AI",
    displayName: "AI 接口",
    description: "管理 OpenAI 兼容接口配置，供总结、提问与 DeArrow 使用。",
    tags: ["core", "ai"],
    icon: BotIcon,
    required: true,
    hidden: true,
    startAt: "Init" /* Init */,
    settings,
    start() {
      configureAI({ list: listProfiles, activeId: () => settings.store.activeProfile });
    }
  });

  // src/api/Notifications.ts
  var DEFAULT_CONFIG = { enabled: true, durations: { info: 3, success: 4, warning: 6, error: 0 } };
  var TITLE_WIDTH = 34;
  var readConfig = () => DEFAULT_CONFIG;
  var byKey = new Map;
  function configureToasts(getter) {
    readConfig = getter;
  }
  function container2() {
    const found = document.querySelector(".ldpp-toasts");
    if (found)
      return found;
    const root = mark(h("div", { class: "ldpp-toasts", attrs: { "aria-live": "polite" } }), "toasts");
    document.body.appendChild(root);
    return root;
  }
  function durationFor(type, explicit) {
    if (explicit != null)
      return explicit;
    if (type === "loading")
      return 0;
    return Math.max(0, readConfig().durations[type] ?? 0) * 1000;
  }
  var NOOP = { closed: true, update() {}, close() {} };
  function closeToast(key) {
    byKey.get(key)?.close();
  }
  function showToast(message, type = "info", options = {}) {
    if (!readConfig().enabled && type !== "error")
      return NOOP;
    const existing = options.key ? byKey.get(options.key) : undefined;
    if (existing && !existing.closed) {
      existing.update(message, type, options.duration);
      return existing;
    }
    const text = h("span", { class: "ldpp-toast-text" }, message);
    const topicLine = options.topicId ? h("div", { class: "ldpp-toast-topic" }, `\uD83D\uDCCC 话题 #${options.topicId}`) : null;
    const el = h("div", { class: `ldpp-toast ldpp-toast-${type}`, attrs: { role: type === "error" ? "alert" : "status" } }, h("span", { class: "ldpp-toast-dot" }), h("div", { class: "ldpp-toast-main" }, text, topicLine));
    let timer = null;
    let closed = false;
    const arm = (ms) => {
      if (timer)
        clearTimeout(timer);
      timer = ms > 0 ? setTimeout(() => handle.close(), ms) : null;
    };
    const handle = {
      get closed() {
        return closed;
      },
      update(next, nextType = type, duration) {
        if (closed)
          return;
        text.textContent = next;
        el.className = `ldpp-toast ldpp-toast-${nextType} is-shown`;
        if (options.onClick)
          el.classList.add("is-clickable");
        arm(durationFor(nextType, duration));
      },
      close() {
        if (closed)
          return;
        closed = true;
        if (timer)
          clearTimeout(timer);
        if (options.key && byKey.get(options.key) === handle)
          byKey.delete(options.key);
        el.classList.remove("is-shown");
        setTimeout(() => el.remove(), 220);
      }
    };
    el.appendChild(IconButton(CloseIcon(14), {
      title: "关闭",
      className: "ldpp-toast-close",
      onClick: (event) => {
        event.stopPropagation();
        options.onDismiss?.();
        handle.close();
      }
    }));
    if (options.onClick) {
      el.classList.add("is-clickable");
      el.addEventListener("click", () => {
        if (closed)
          return;
        options.onClick?.();
        handle.close();
      });
    }
    if (options.topicId && topicLine) {
      const topicId = options.topicId;
      resolveTopicTitle(topicId).then((title) => {
        if (!title || closed)
          return;
        topicLine.textContent = `\uD83D\uDCCC ${truncateVisual(title, TITLE_WIDTH)}`;
        topicLine.title = title;
      }, () => {
        return;
      });
    }
    container2().appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-shown"));
    arm(durationFor(type, options.duration));
    if (options.key)
      byKey.set(options.key, handle);
    return handle;
  }

  // src/plugins/_core/notifications/index.ts
  var settings2 = definePluginSettings({
    enabled: {
      type: 2 /* BOOLEAN */,
      description: "显示 Toast 通知（错误提示始终显示）。",
      default: true
    },
    infoSeconds: {
      type: 4 /* SLIDER */,
      description: "「信息」通知自动关闭秒数，0 表示不自动关闭。",
      min: 0,
      max: 30,
      default: 3
    },
    successSeconds: {
      type: 4 /* SLIDER */,
      description: "「成功」通知自动关闭秒数。",
      min: 0,
      max: 30,
      default: 4
    },
    warningSeconds: {
      type: 4 /* SLIDER */,
      description: "「警告」通知自动关闭秒数。",
      min: 0,
      max: 30,
      default: 6
    },
    errorSeconds: {
      type: 4 /* SLIDER */,
      description: "「错误」通知自动关闭秒数，默认常驻。",
      min: 0,
      max: 60,
      default: 0
    },
    clickExpands: {
      type: 2 /* BOOLEAN */,
      description: "点击话题通知时，在列表中定位并展开该话题的总结。",
      default: true
    },
    clickOpensSidebar: {
      type: 2 /* BOOLEAN */,
      description: "在话题页点击当前话题的通知时，打开侧栏。",
      default: true
    }
  });
  function previewToasts() {
    showToast("这是一条信息通知", "info");
    showToast("这是一条成功通知", "success");
    showToast("这是一条警告通知", "warning");
    showToast("这是一条错误通知", "error");
  }
  var notifications_default = definePlugin({
    name: "Notifications",
    displayName: "通知",
    description: "Toast 通知的开关与自动关闭时长。",
    tags: ["core"],
    icon: BellIcon,
    required: true,
    startAt: "Init" /* Init */,
    settings: settings2,
    start() {
      configureToasts(() => ({
        enabled: settings2.store.enabled,
        durations: {
          info: settings2.store.infoSeconds,
          success: settings2.store.successSeconds,
          warning: settings2.store.warningSeconds,
          error: settings2.store.errorSeconds
        }
      }));
    }
  });

  // ldpp-css:src/plugins/_core/settings/styles.css
  registerStyle("settings", `.ldpp-settings .ldpp-dialog-body {
    padding: 0;
    overflow: hidden;
}

.ldpp-settings-layout {
    display: flex;
    height: 100%;
    min-height: 0;
}

.ldpp-settings-nav {
    flex: none;
    width: 9.5rem;
    padding: 0.75rem;
    border-right: 1px solid var(--ldpp-line);
    overflow: auto;
}

.ldpp-settings-main {
    flex: 1 1 auto;
    min-width: 0;
    padding: 1rem 1.25rem;
    overflow: auto;
    overscroll-behavior: contain;
}

/* 「功能」 tab — layout and interaction follow Void++'s Plugins tab. */
.ldpp-plugins {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/*
 * 「功能」 and 「主题」 keep their tabs, search and filter in place and scroll only the cards, like Void++'s Plugins
 * tab (.void-plugins-root fills the panel, .void-plugins-list scrolls): the page fills the content area, the grid
 * takes the remaining height, and its negative inline margin puts the scrollbar at the panel's edge.
 */
.ldpp-settings-main:has(> .ldpp-tab-panel > :is(.ldpp-plugins, .ldpp-themes)) {
    display: flex;
    flex-direction: column;
    padding-bottom: 0;
    overflow: hidden;
}

.ldpp-settings-main > .ldpp-tab-panel:has(> :is(.ldpp-plugins, .ldpp-themes)) {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
}

.ldpp-tab-panel > :is(.ldpp-plugins, .ldpp-themes) {
    flex: 1 1 auto;
    min-height: 0;
}

/* The list scrolls in the panel's side padding; its scrollbar takes its width out of the right padding (the gutter is
   kept even when nothing overflows), so the cards end at the header's right edge, not 15px short of it. */
:is(.ldpp-plugins, .ldpp-themes) > .ldpp-plugins-grid {
    flex: 1 1 auto;
    align-content: start;
    min-height: 0;
    margin-inline: -1.25rem;
    padding: 0 max(0px, calc(1.25rem - var(--ldpp-scrollbar, 0px))) 1rem 1.25rem;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
}

.ldpp-plugins-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.125rem;
    border-bottom: 1px solid var(--ldpp-line);
}

.ldpp-plugins-tab {
    position: relative;
    margin: 0;
    padding: 0.35rem 0.65rem;
    border: 0;
    border-radius: var(--ldpp-btn-radius);
    background: transparent;
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
    cursor: pointer;
}

@media (hover: hover) {
    .ldpp-plugins-tab:hover {
        background: var(--ldpp-flat-bg-hover);
        color: var(--ldpp-fg);
    }
}

.ldpp-plugins-tab.is-active {
    color: var(--ldpp-fg);
}

.ldpp-plugins-tab.is-active::after {
    content: "";
    position: absolute;
    inset-inline: 0.5rem;
    bottom: -1px;
    height: 2px;
    border-radius: 1px;
    background: var(--ldpp-fg);
}

.ldpp-plugins-toolbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.ldpp-plugins-search {
    flex: 1 1 auto;
    min-width: 0;
}

.ldpp-plugins-toolbar .ldpp-plugins-filter {
    flex: none;
    width: auto;
}

.ldpp-plugins-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
}

.ldpp-plugins-empty {
    grid-column: 1 / -1;
    margin: 1rem 0;
    text-align: center;
}

.ldpp-plugin-card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 7.5rem;
    overflow: hidden;
    border: 1px solid var(--ldpp-line);
    border-radius: 0.5rem;
    background: var(--ldpp-bg);
}

.ldpp-plugin-card-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.625rem 0.75rem;
}

.ldpp-plugin-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}

.ldpp-plugin-card-name {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    overflow: hidden;
}

.ldpp-plugin-card-icon {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 0.5rem;
    background: color-mix(in srgb, var(--ldpp-fg) 10%, transparent);
    color: var(--ldpp-fg);
    line-height: 0;
}

.ldpp-plugin-card-icon .ldpp-icon {
    width: 0.875rem;
    height: 0.875rem;
}

.ldpp-plugin-card-title {
    overflow: hidden;
    min-width: 0;
    font-size: 0.875rem;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ldpp-plugin-card-controls {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.25rem;
}

.ldpp-plugin-card-controls .ldpp-row-btn {
    min-width: 1.6rem;
    height: 1.6rem;
    padding: 0;
}

.ldpp-plugin-star,
.ldpp-plugin-pin,
.ldpp-plugin-config {
    --ldpp-flat-rest: var(--primary-medium, var(--ldpp-muted));
}

.ldpp-plugin-star.is-on,
.ldpp-plugin-pin.is-on {
    --ldpp-flat-rest: var(--ldpp-fg);
}

.ldpp-plugin-card-controls .ldpp-switch {
    margin-inline-start: 0.25rem;
}

.ldpp-plugin-card-desc {
    display: -webkit-box;
    overflow: hidden;
    margin: 0.25rem 0 0;
    color: var(--ldpp-muted);
    font-size: 0.8125rem;
    line-height: 1.5;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
}

.ldpp-plugin-card-footer {
    overflow: hidden;
    padding: 0.375rem 0.75rem;
    border-top: 1px solid var(--ldpp-line);
    color: var(--primary-medium, var(--ldpp-muted));
    font-size: 0.7rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ldpp-plugin-card.is-off .ldpp-plugin-card-name,
.ldpp-plugin-card.is-off .ldpp-plugin-card-desc {
    opacity: 0.6;
}

@media (max-width: 720px) {
    .ldpp-plugins-grid {
        grid-template-columns: minmax(0, 1fr);
    }
}

/* Per-plugin settings dialog (Void++ PluginDialog): description, then the settings list, 「重置」 in the footer. */
.ldpp-plugin-dialog .ldpp-dialog-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.ldpp-plugin-dialog-desc {
    margin: 0;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--ldpp-line);
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
    line-height: 1.55;
}

.ldpp-plugin-dialog-label {
    margin: 0;
    font-size: var(--ldpp-font-sm);
    font-weight: 600;
}

.ldpp-plugin-dialog .ldpp-dialog-footer {
    justify-content: flex-end;
}

.ldpp-settings-form .ldpp-field:last-child {
    border-bottom: 0;
}

.ldpp-field-control {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 12rem;
}

.ldpp-field-error {
    margin: 0;
    overflow-wrap: anywhere;
    color: var(--ldpp-danger);
    font-size: var(--ldpp-font-sm);
}

.ldpp-field-error:empty {
    display: none;
}

.ldpp-slider-wrap {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.ldpp-slider {
    width: 10rem;
    accent-color: var(--ldpp-accent);
}

.ldpp-slider-value {
    min-width: 3em;
    color: var(--ldpp-muted);
    font-variant-numeric: tabular-nums;
}

.ldpp-stats {
    margin: 0.25rem 0;
    padding-left: 1.25rem;
    line-height: 1.8;
}

.ldpp-about h3 {
    margin-top: 0;
}

/* Image options sit in two columns under 「图片输入」 (four single rows took 254 px). */
.ldpp-ai-images:not([hidden]) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 1.5rem;
    margin-left: 1rem;
    padding-left: 0.75rem;
    border-left: 2px solid var(--ldpp-line);
}

/* Two image options per row: a narrower control column (still shared within each column) keeps the labels on one
   line - with the usual 62% 「每次最多图片数」 wrapped. */
.ldpp-ai-images .ldpp-field-head > :is(input, select, .ldpp-number-wrap) {
    flex-basis: 55%;
    max-width: 55%;
}

/* The last row closes the box, so neither of its cells draws a rule: only the very last field dropped its border,
   which left a half-width line under 「单张上限」 and none under 「总量上限」 beside it. */
@media (min-width: 721px) {
    .ldpp-ai-images > .ldpp-field:nth-child(odd):nth-last-child(-n + 2) {
        border-bottom: 0;
    }
}

@media (max-width: 720px) {
    .ldpp-ai-images:not([hidden]) {
        grid-template-columns: minmax(0, 1fr);
    }
}

.ldpp-header-button .ldpp-icon {
    width: 1.1em;
    height: 1.1em;
}

@media (max-width: 720px) {
    .ldpp-settings-layout {
        flex-direction: column;
    }

    .ldpp-settings-nav {
        width: auto;
        border-right: 0;
        border-bottom: 1px solid var(--ldpp-line);
    }

    .ldpp-settings-nav .ldpp-tabs-vertical {
        flex-flow: row wrap;
    }
}

/* Grouped long settings: one tab shown at a time. */
.ldpp-settings-group .ldpp-subtabs {
    margin-bottom: 0.5rem;
}

.ldpp-settings-group-desc {
    margin: 0 0 0.4rem;
    font-size: var(--ldpp-font-sm);
}

.ldpp-settings-group-panel > .ldpp-field {
    padding: 0;
    border: 0;
}

.ldpp-settings-group-panel .ldpp-field-label:empty {
    display: none;
}
`);

  // src/plugins/_core/userStyles/cssEditor.ts
  var TOKEN = /\/\*[\s\S]*?(?:\*\/|$)|@[\w-]+|"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|[.#][A-Za-z_-][\w-]*|#[\da-fA-F]{3,8}\b|-?(?:\d+\.?\d*|\.\d+)(?:px|em|rem|%|vh|vw|vmin|vmax|s|ms|deg|fr|ch|ex)?|[\w-]+|[{}:;,()!]/g;
  function highlightCss(css) {
    const out = document.createDocumentFragment();
    const piece = (kind, text) => out.append(h("span", { class: `ldpp-css-${kind}` }, text));
    let depth = 0;
    let afterColon = false;
    let last = 0;
    for (const match of css.matchAll(TOKEN)) {
      const index = match.index ?? 0;
      if (index > last)
        out.append(css.slice(last, index));
      last = index + match[0].length;
      const token = match[0];
      if (token.startsWith("/*")) {
        piece("com", token);
        afterColon = false;
      } else if (token.startsWith("@"))
        piece("at", token);
      else if (token === "{") {
        depth++;
        afterColon = false;
        piece("brace", token);
      } else if (token === "}") {
        depth = Math.max(0, depth - 1);
        afterColon = false;
        piece("brace", token);
      } else if (token === ":") {
        afterColon = depth > 0;
        piece("punct", token);
      } else if (token === ";" || token === ",") {
        afterColon = false;
        piece("punct", token);
      } else if ("()!".includes(token))
        piece("punct", token);
      else if (token.startsWith('"') || token.startsWith("'"))
        piece("str", token);
      else if ((token.startsWith(".") || token.startsWith("#")) && /^[.#][A-Za-z_-]/.test(token) && !afterColon)
        piece("sel", token);
      else if (token.startsWith("#") || /^-?[\d.]/.test(token))
        piece("num", token);
      else if (afterColon)
        piece("val", token);
      else if (depth > 0)
        piece("prop", token);
      else
        piece("sel", token);
    }
    if (last < css.length)
      out.append(css.slice(last));
    out.append(`
`);
    return out;
  }
  function formatCss(raw) {
    const tokens = raw.replaceAll(/\s+/g, " ").trim().split(/(?=[{}:;])|(?<=[{}:;])/g).map((part) => part.trim()).filter(Boolean);
    const inSelector = (from) => {
      for (let i = from;i < tokens.length; i++) {
        if (tokens[i] === "{")
          return true;
        if (tokens[i] === ";" || tokens[i] === "}")
          return false;
      }
      return false;
    };
    let out = "";
    let indent = 0;
    let glue = false;
    const pad = () => "    ".repeat(indent);
    tokens.forEach((token, index) => {
      if (token === "{") {
        out += ` {
`;
        indent++;
      } else if (token === "}") {
        if (!out.endsWith(`
`))
          out += `;
`;
        indent = Math.max(0, indent - 1);
        out += `${pad()}}

`;
      } else if (token === ";")
        out += `;
`;
      else if (token === ":") {
        glue = inSelector(index);
        out += glue ? ":" : ": ";
      } else {
        out += out === "" || out.endsWith(`
`) ? pad() + token : glue ? token : out.endsWith(" ") ? token : ` ${token}`;
        glue = false;
      }
    });
    return `${out.replaceAll(/\n{3,}/g, `

`).trim()}
`;
  }
  function CssEditor({ value, placeholder, disabled, onChange }) {
    const highlight = h("pre", { class: "ldpp-css-highlight", attrs: { "aria-hidden": "true" } });
    const textarea = h("textarea", { class: "ldpp-css-input", value, placeholder: placeholder ?? "", spellcheck: false, attrs: { autocomplete: "off", autocorrect: "off", autocapitalize: "off", "aria-label": placeholder ?? "CSS" } });
    const el = h("div", { class: "ldpp-css-wrap" }, highlight, textarea);
    const paint = () => highlight.replaceChildren(highlightCss(textarea.value));
    textarea.addEventListener("input", () => {
      paint();
      onChange(textarea.value);
    });
    textarea.addEventListener("paste", (event) => {
      const pasted = event.clipboardData?.getData("text/plain") ?? "";
      if (!pasted.includes("{") || pasted.includes(`
`))
        return;
      event.preventDefault();
      const { selectionStart: start, selectionEnd: end } = textarea;
      const formatted = formatCss(pasted);
      textarea.value = textarea.value.slice(0, start) + formatted + textarea.value.slice(end);
      textarea.selectionStart = textarea.selectionEnd = start + formatted.length;
      textarea.dispatchEvent(new Event("input"));
    });
    const setDisabled = (next) => {
      textarea.disabled = next;
      el.classList.toggle("is-disabled", next);
    };
    setDisabled(Boolean(disabled));
    paint();
    return { el, textarea, setDisabled };
  }

  // ldpp-css:src/plugins/_core/userStyles/styles.css
  registerStyle("userStyles", `/* 「主题」 tab (Void++ ThemesTab): two source rows, then search/filter and the same 2-column cards as 「功能」. */
.ldpp-themes {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.ldpp-themes-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--ldpp-line);
}

.ldpp-themes-actions {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.ldpp-themes .ldpp-plugins-toolbar[hidden] {
    display: none;
}

.ldpp-row-btn.ldpp-theme-remove {
    --ldpp-flat-bg-hover: var(--danger-low, color-mix(in srgb, var(--ldpp-danger) 20%, transparent));
    --ldpp-flat-bg-focus: var(--ldpp-flat-bg-hover);
    --ldpp-flat-icon-hover: var(--danger, var(--ldpp-danger));
}

.ldpp-theme-card-footer {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    min-width: 0;
}

.ldpp-theme-card-footer > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ldpp-backup-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

.ldpp-backup-list .ldpp-check {
    flex-wrap: wrap;
    column-gap: 0.5rem;
}

.ldpp-backup-name {
    font-weight: 600;
}

/* Variable controls use the shared field column (core.css); a checkbox variable keeps its switch at the right. */
.ldpp-field-head > .ldpp-theme-var-control {
    display: flex;
    justify-content: flex-end;
}

.ldpp-theme-var-control:not(.is-switch) > *,
.ldpp-theme-var-control .ldpp-number-wrap > .ldpp-input {
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
    max-width: none;
}

.ldpp-color-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.ldpp-color-field > .ldpp-input {
    flex: 1 1 auto;
    min-width: 0;
}

/* The native swatch, sized like the text box beside it. */
.ldpp-color-swatch.ldpp-color-swatch {
    flex: none;
    width: 2.1rem;
    height: 2.1rem;
    margin: 0;
    padding: 2px;
    border: 1px solid var(--ldpp-line);
    border-radius: 6px;
    background: var(--ldpp-bg);
    cursor: pointer;
}

/* 「快速 CSS」 tab and the theme editor: the editor takes the rest of the height and scrolls on its own. */
.ldpp-tab-panel:has(> .ldpp-quick-css) {
    height: 100%;
}

.ldpp-quick-css {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100%;
    min-height: 0;
}

.ldpp-quick-css > .ldpp-field {
    flex: none;
    padding: 0;
    border: 0;
}

.ldpp-theme-edit .ldpp-dialog-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow: hidden;
}

.ldpp-theme-edit .ldpp-field {
    flex: none;
    padding: 0;
    border: 0;
}

.ldpp-theme-edit .ldpp-field-error:empty {
    display: none;
}

/* Void++ CssEditor: textarea and highlight share one grid cell; the frame scrolls both. */
.ldpp-css-wrap {
    display: grid;
    /* At least the frame's height, so a click below the last line still lands in the textarea. */
    grid-template-rows: minmax(100%, auto);
    flex: 1 1 auto;
    min-height: 12rem;
    border: 1px solid var(--ldpp-line);
    border-radius: var(--ldpp-radius, 8px);
    background: var(--ldpp-soft);
    overflow: auto;
    overscroll-behavior: contain;
}

.ldpp-css-wrap:focus-within {
    border-color: var(--ldpp-accent);
    box-shadow: inset 0 0 0 1px var(--ldpp-accent);
}

.ldpp-css-wrap.is-disabled {
    opacity: 0.6;
}

.ldpp-css-highlight,
.ldpp-css-wrap > textarea.ldpp-css-input {
    grid-area: 1 / 1;
    box-sizing: border-box;
    width: 100%;
    margin: 0;
    padding: 0.75rem;
    border: 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "DejaVu Sans Mono", monospace;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.55;
    letter-spacing: normal;
    word-spacing: normal;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    tab-size: 4;
}

.ldpp-css-highlight {
    color: var(--primary-medium, var(--ldpp-muted));
    pointer-events: none;
}

.ldpp-css-wrap > textarea.ldpp-css-input {
    height: auto;
    overflow: hidden;
    resize: none;
    background: transparent;
    color: transparent;
    caret-color: var(--primary, var(--ldpp-fg));
    box-shadow: none;
    outline: none;
}

.ldpp-css-wrap > textarea.ldpp-css-input::placeholder {
    color: var(--primary-medium, var(--ldpp-muted));
}

/* Token colours from the Discourse palette, so they follow the light/dark scheme. */
.ldpp-css-sel { color: var(--tertiary, #08c); }
.ldpp-css-prop { color: var(--primary-high, #555); }
.ldpp-css-val { color: var(--primary, #222); }
.ldpp-css-str { color: var(--success, #090); }
.ldpp-css-num { color: var(--quaternary, #e45735); }
.ldpp-css-at { color: var(--love, #fa6c8d); }
.ldpp-css-com { color: var(--primary-medium, #888); font-style: italic; }
.ldpp-css-brace,
.ldpp-css-punct { color: var(--primary-medium, #888); }
`);

  // src/plugins/_core/userStyles/usercss.ts
  var import_usercss_meta = __toESM(require_usercss_meta(), 1);
  var SUPPORTED_PREPROCESSORS = new Set(["default", "uso"]);
  var META_BLOCK = /\/\*\s*==UserStyle==[\s\S]*?==\/UserStyle==\s*\*\//i;
  function hasUserCssMeta(source) {
    return META_BLOCK.test(source);
  }
  function str(value) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }
  function normalizeVar(name, raw) {
    const type = str(raw.type) ?? "text";
    const options = Array.isArray(raw.options) ? raw.options.map((option) => ({ name: String(option.name ?? ""), label: String(option.label ?? option.name ?? ""), value: String(option.value ?? "") })) : null;
    const variable = {
      type,
      name,
      label: str(raw.label) ?? name,
      value: raw.value == null ? null : raw.value,
      default: raw.default ?? "",
      options
    };
    for (const key of ["min", "max", "step"])
      if (typeof raw[key] === "number")
        variable[key] = raw[key];
    if (typeof raw.units === "string")
      variable.units = raw.units;
    return variable;
  }
  function parseUserCss(source) {
    const block = source.match(META_BLOCK)?.[0];
    if (!block)
      throw new Error("没有找到 ==UserStyle== 元数据");
    let metadata;
    try {
      metadata = import_usercss_meta.parse(block, { mandatoryKeys: ["name"] }).metadata;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`元数据格式错误：${message}`, { cause: error });
    }
    const vars = Object.fromEntries(Object.entries(metadata.vars ?? {}).map(([name, raw]) => [name, normalizeVar(name, raw)]));
    return {
      name: str(metadata.name) ?? "未命名样式",
      namespace: str(metadata.namespace),
      version: str(metadata.version),
      description: str(metadata.description),
      author: str(metadata.author),
      homepageURL: str(metadata.homepageURL),
      updateURL: str(metadata.updateURL),
      preprocessor: str(metadata.preprocessor) ?? "default",
      vars
    };
  }
  function varValue(variable) {
    const chosen = variable.value ?? variable.default;
    if (variable.options) {
      const option = variable.options.find((item) => item.name === String(chosen)) ?? variable.options[0];
      return option?.value ?? "";
    }
    if (variable.type === "number" || variable.type === "range")
      return `${chosen}${variable.units ?? ""}`;
    return String(chosen ?? "");
  }
  var NAMED_COLORS = { black: "0, 0, 0", white: "255, 255, 255", red: "255, 0, 0", green: "0, 128, 0", blue: "0, 0, 255", gray: "128, 128, 128", grey: "128, 128, 128", yellow: "255, 255, 0", orange: "255, 165, 0", purple: "128, 0, 128", transparent: "0, 0, 0" };
  function colorToRgb(value) {
    const color = value.trim().toLowerCase();
    if (NAMED_COLORS[color])
      return NAMED_COLORS[color];
    let hex = color.match(/^#([\da-f]{3,8})$/)?.[1];
    if (hex) {
      if (hex.length <= 4)
        hex = [...hex].map((char) => char + char).join("");
      return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)).join(", ");
    }
    const rgb = color.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
    return rgb ? `${rgb[1]}, ${rgb[2]}, ${rgb[3]}` : null;
  }
  function applyUso(source, vars) {
    const pool = new Map;
    const resolve = (name) => {
      if (vars[name])
        return varValue(vars[name]);
      const base = name.match(/^(.+)-rgb$/)?.[1];
      if (base && vars[base])
        return colorToRgb(varValue(vars[base]));
      return null;
    };
    const replace = (text, depth) => text.replaceAll(/\/\*\[\[([\w-]+)\]\]\*\//g, (match, name) => {
      if (!pool.has(name)) {
        const value = resolve(name);
        pool.set(name, value == null ? match : depth < 8 ? replace(value, depth + 1) : value);
      }
      return pool.get(name);
    });
    return replace(source, 0);
  }
  var GLOBAL_STATEMENT = /^(?:\s+|\/\*[\s\S]*?\*\/|@(?:charset|import|namespace)\b[^;]*;)*/;
  function withRootVars(code, vars) {
    const names = Object.keys(vars);
    if (!names.length || isEmptyCode(code))
      return code;
    const block = `:root {
${names.map((name) => `  --${name}: ${varValue(vars[name])};
`).join("")}}
`;
    const at = code.match(GLOBAL_STATEMENT)?.[0].length ?? 0;
    return code.slice(0, at) + block + code.slice(at);
  }
  function isEmptyCode(code) {
    return !code.replaceAll(/\/\*[\s\S]*?\*\//g, "").trim();
  }
  function skipComment(text, index) {
    const end = text.indexOf("*/", index + 2);
    return end < 0 ? text.length : end + 2;
  }
  function skipString(text, index) {
    const quote = text[index];
    for (let i = index + 1;i < text.length; i++) {
      if (text[i] === "\\")
        i++;
      else if (text[i] === quote)
        return i + 1;
    }
    return text.length;
  }
  function blockEnd(text, open) {
    let depth = 0;
    for (let i = open;i < text.length; ) {
      const char = text[i];
      if (char === "/" && text[i + 1] === "*") {
        i = skipComment(text, i);
        continue;
      }
      if (char === '"' || char === "'") {
        i = skipString(text, i);
        continue;
      }
      if (char === "{")
        depth++;
      else if (char === "}" && --depth === 0)
        return i + 1;
      i++;
    }
    return text.length;
  }
  var unescapeCss = (value) => value.replaceAll(/\\([\da-fA-F]{1,6}\s?|[\s\S])/g, (_, escape) => /^[\da-fA-F]/.test(escape) && escape.trim().length > 1 ? String.fromCodePoint(Number.parseInt(escape.trim(), 16)) : escape);
  var CONDITION = /(url-prefix|url|domain|regexp)\(\s*(?:"((?:[^"\\]|\\[\s\S])*)"|'((?:[^'\\]|\\[\s\S])*)'|([^)]*?))\s*\)/gi;
  var CONDITION_KEY = { url: "urls", "url-prefix": "urlPrefixes", domain: "domains", regexp: "regexps" };
  function parseConditions(text) {
    const section = {};
    for (const match of text.matchAll(CONDITION)) {
      const key = CONDITION_KEY[match[1].toLowerCase()];
      const quoted = match[2] ?? match[3];
      const value = quoted != null ? unescapeCss(quoted) : match[4].trim();
      (section[key] ??= []).push(value);
    }
    return section;
  }
  function extractSections(css) {
    const sections = [];
    let outside = "";
    let from = 0;
    for (let i = 0;i < css.length; ) {
      const char = css[i];
      if (char === "/" && css[i + 1] === "*") {
        i = skipComment(css, i);
        continue;
      }
      if (char === '"' || char === "'") {
        i = skipString(css, i);
        continue;
      }
      if (char === "{") {
        i = blockEnd(css, i);
        continue;
      }
      if (char === "@" && /^@(?:-moz-)?document\b/i.test(css.slice(i, i + 15))) {
        const open = css.indexOf("{", i);
        if (open < 0)
          break;
        const close = blockEnd(css, open);
        outside += css.slice(from, i);
        sections.push({ ...parseConditions(css.slice(i, open)), code: css.slice(open + 1, close - 1).trim() });
        i = from = close;
        continue;
      }
      i++;
    }
    outside += css.slice(from);
    const globalCode = outside.replace(META_BLOCK, "").trim();
    if (!isEmptyCode(globalCode))
      sections.unshift({ code: globalCode });
    return sections.filter((section) => !isEmptyCode(section.code));
  }
  function compileUserCss(source, meta) {
    if (!SUPPORTED_PREPROCESSORS.has(meta.preprocessor))
      throw new Error(`使用了 @preprocessor ${meta.preprocessor}，需要对应的编译器，LD++ 暂不支持；可在 Stylus 中导出备份（JSON）后导入，会直接使用备份里已编译的结果`);
    const code = meta.preprocessor === "uso" ? applyUso(source, meta.vars) : source;
    const sections = extractSections(code);
    return meta.preprocessor === "default" ? sections.map((section) => ({ ...section, code: withRootVars(section.code, meta.vars) })) : sections;
  }
  var isGlobal = (section) => !section.domains?.length && !section.urlPrefixes?.length && !section.urls?.length && !section.regexps?.length;
  var regexCache = new Map;
  function fullMatch(pattern) {
    if (!regexCache.has(pattern)) {
      try {
        regexCache.set(pattern, new RegExp(`^(?:${pattern})$`));
      } catch {
        regexCache.set(pattern, null);
      }
    }
    return regexCache.get(pattern) ?? null;
  }
  function sectionMatches(section, href) {
    if (isGlobal(section))
      return true;
    let host = "";
    try {
      host = new URL(href).hostname;
    } catch {}
    const bare = href.split("#")[0];
    return Boolean(section.domains?.some((domain) => host === domain || host.endsWith(`.${domain}`)) || section.urlPrefixes?.some((prefix) => href.startsWith(prefix)) || section.urls?.some((url) => url === href || url === bare) || section.regexps?.some((pattern) => fullMatch(pattern)?.test(href)));
  }
  var isPathDependent = (section) => Boolean(section.urlPrefixes?.length || section.urls?.length || section.regexps?.length);
  var SITE_SAMPLES = ["https://linux.do/", "https://linux.do/latest", "https://linux.do/t/topic/1", "https://linux.do/search?q=a", "https://linux.do/u/me"];
  function appliesToSite(sections) {
    return sections.some((section) => isGlobal(section) || section.domains?.some((domain) => domain === "linux.do" || "linux.do".endsWith(`.${domain}`)) || section.urlPrefixes?.some((prefix) => "https://linux.do/".startsWith(prefix) || prefix.startsWith("https://linux.do")) || section.urls?.some((url) => url.startsWith("https://linux.do")) || section.regexps?.some((pattern) => SITE_SAMPLES.some((sample) => fullMatch(pattern)?.test(sample))));
  }
  function cssFor(sections, href) {
    return sections.filter((section) => sectionMatches(section, href)).map((section) => section.code).join(`
`);
  }
  var quote = (value) => JSON.stringify(value);
  function sectionsToSource(sections) {
    return sections.map((section) => {
      if (isGlobal(section))
        return section.code;
      const conditions = [
        ...(section.domains ?? []).map((value) => `domain(${quote(value)})`),
        ...(section.urlPrefixes ?? []).map((value) => `url-prefix(${quote(value)})`),
        ...(section.urls ?? []).map((value) => `url(${quote(value)})`),
        ...(section.regexps ?? []).map((value) => `regexp(${quote(value)})`)
      ];
      return `@-moz-document ${conditions.join(", ")} {
${section.code}
}`;
    }).join(`

`);
  }
  function cleanSection(raw) {
    const section = { code: String(raw.code ?? "") };
    for (const key of ["domains", "urlPrefixes", "urls", "regexps"]) {
      const list = Array.isArray(raw[key]) ? raw[key].map(String).filter(Boolean) : [];
      if (list.length)
        section[key] = list;
    }
    return section;
  }
  function readStylusBackup(raw) {
    const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray(raw.styles) ? raw.styles : null;
    if (!list)
      return null;
    const styles = list.filter((item) => Boolean(item) && typeof item === "object" && Array.isArray(item.sections));
    if (!styles.length)
      return null;
    return styles.map((style) => {
      const usercss = style.usercssData ?? null;
      const vars = usercss?.vars && typeof usercss.vars === "object" ? Object.fromEntries(Object.entries(usercss.vars).map(([name, value]) => [name, normalizeVar(name, value)])) : undefined;
      return {
        name: str(style.name) ?? "未命名样式",
        enabled: style.enabled !== false,
        author: str(style.author) ?? str(usercss?.author),
        description: str(style.description) ?? str(usercss?.description),
        updateUrl: str(style.updateUrl),
        sections: style.sections.map(cleanSection).filter((section) => !isEmptyCode(section.code)),
        sourceCode: str(style.sourceCode),
        preprocessor: usercss ? str(usercss.preprocessor) ?? "default" : undefined,
        vars
      };
    });
  }

  // src/plugins/_core/userStyles/index.ts
  var logger8 = new Logger("UserStyles");
  var settings3 = definePluginSettings({
    styles: { type: 6 /* CUSTOM */, default: [] },
    quickCss: { type: 6 /* CUSTOM */, default: "" },
    quickCssEnabled: { type: 6 /* CUSTOM */, default: true }
  });
  function listStyles() {
    const raw = settings3.store.styles;
    return Array.isArray(raw) ? raw : [];
  }
  var plain = (value) => JSON.parse(JSON.stringify(value));
  function saveStyles(next) {
    settings3.store.styles = plain(next);
    applyAll();
  }
  function getStyle(id) {
    return listStyles().find((style) => style.id === id);
  }
  function updateStyle(id, patch) {
    saveStyles(listStyles().map((style) => style.id === id ? { ...style, ...patch } : style));
  }
  function removeStyle(id) {
    saveStyles(listStyles().filter((style) => style.id !== id));
  }
  function carryValues(next, previous) {
    if (!previous)
      return next;
    return Object.fromEntries(Object.entries(next).map(([name, variable]) => {
      const old = previous[name];
      const keep = old && old.type === variable.type && old.value != null && (!variable.options || variable.options.some((option) => option.name === String(old.value)));
      return [name, keep ? { ...variable, value: old.value } : variable];
    }));
  }
  function buildStyle(input) {
    const now = Date.now();
    const base = {
      id: input.previous?.id ?? randomId("style-"),
      enabled: input.enabled ?? input.previous?.enabled ?? true,
      origin: input.origin ?? input.previous?.origin ?? "local",
      url: input.url ?? input.previous?.url,
      installedAt: input.previous?.installedAt ?? now,
      updatedAt: now,
      checkedAt: input.origin === "online" || input.previous?.origin === "online" ? now : undefined,
      source: input.source
    };
    if (!hasUserCssMeta(input.source)) {
      return { ...base, name: input.name?.trim() || input.previous?.name || "未命名样式", author: input.author, description: input.description, preprocessor: "default", vars: {}, sections: extractSections(input.source) };
    }
    const meta = parseUserCss(input.source);
    meta.vars = carryValues(input.vars ? carryValues(meta.vars, input.vars) : meta.vars, input.previous?.vars);
    return {
      ...base,
      name: meta.name,
      namespace: meta.namespace,
      version: meta.version,
      description: meta.description ?? input.description,
      author: meta.author ?? input.author,
      homepage: meta.homepageURL,
      url: base.url ?? meta.updateURL,
      preprocessor: meta.preprocessor,
      vars: meta.vars,
      sections: compileUserCss(input.source, meta)
    };
  }
  function recompile(style, vars) {
    if (!hasUserCssMeta(style.source))
      return { ...style, vars };
    const meta = parseUserCss(style.source);
    meta.vars = carryValues(meta.vars, vars);
    return { ...style, vars: meta.vars, sections: compileUserCss(style.source, meta), updatedAt: Date.now() };
  }
  function findExisting(style, list = listStyles()) {
    return list.find((item) => item.id !== style.id && (style.url && item.url === style.url || style.namespace && item.namespace === style.namespace && item.name === style.name));
  }
  function installStyle(style) {
    const list = listStyles();
    const existing = findExisting(style, list);
    if (!existing) {
      saveStyles([...list, style]);
      return "added";
    }
    const kept = { ...style, id: existing.id, enabled: existing.enabled, installedAt: existing.installedAt };
    const merged = hasUserCssMeta(style.source) && Object.keys(existing.vars).length ? recompile(kept, existing.vars) : kept;
    saveStyles(list.map((item) => item.id === existing.id ? merged : item));
    return "updated";
  }
  async function fetchStyleSource(url) {
    const response = await httpRequest({ url, timeout: 30000 });
    if (!response.ok)
      throw new Error(`下载失败（HTTP ${response.status}）`);
    const text = response.text;
    if (/^\s*</.test(text) && !hasUserCssMeta(text))
      throw new Error("这个网址返回的是网页，不是样式文件（.user.css）");
    return text;
  }
  var DAY = 24 * 60 * 60 * 1000;
  async function checkUpdates() {
    for (const style of listStyles()) {
      if (style.origin !== "online" || !style.url || Date.now() - (style.checkedAt ?? 0) < DAY)
        continue;
      try {
        const source = await fetchStyleSource(style.url);
        const current = getStyle(style.id);
        if (!current)
          continue;
        if (source === current.source)
          updateStyle(current.id, { checkedAt: Date.now() });
        else
          installStyle(buildStyle({ source, previous: current }));
      } catch (error) {
        logger8.warn(`更新样式「${style.name}」失败`, error);
        updateStyle(style.id, { checkedAt: Date.now() });
      }
    }
  }
  var QUICK = "quick-css";
  var host = null;
  var elements = new Map;
  function container3() {
    if (!host)
      host = mark(document.createElement("ldpp-user-styles"), "user-styles");
    const root = document.documentElement;
    if (host.parentNode !== root || root.lastElementChild !== host)
      root.appendChild(host);
    return host;
  }
  function put(key, css) {
    let el = elements.get(key);
    if (!css) {
      el?.remove();
      elements.delete(key);
      return;
    }
    if (!el) {
      el = document.createElement("style");
      el.dataset.ldppUserStyle = key;
      elements.set(key, el);
    }
    if (el.textContent !== css)
      el.textContent = css;
    const box = container3();
    if (el.parentNode !== box)
      box.appendChild(el);
  }
  function applyAll() {
    const href = location.href;
    const wanted = new Set;
    for (const style of listStyles()) {
      if (!style.enabled)
        continue;
      wanted.add(style.id);
      put(style.id, cssFor(style.sections, href));
    }
    for (const key of elements.keys())
      if (key !== QUICK && !wanted.has(key))
        put(key, "");
    put(QUICK, settings3.store.quickCssEnabled !== false ? String(settings3.store.quickCss ?? "") : "");
    const quick = elements.get(QUICK);
    if (quick && quick.nextSibling)
      container3().appendChild(quick);
  }
  function setQuickCss(css) {
    settings3.store.quickCss = css;
    applyAll();
  }
  function setQuickCssEnabled(enabled) {
    settings3.store.quickCssEnabled = enabled;
    applyAll();
  }
  var userStyles_default = definePlugin({
    name: "UserStyles",
    displayName: "主题与快速 CSS",
    description: "安装 Stylus 样式（UserCSS）与快速 CSS，作用于 linux.do。",
    tags: ["core"],
    icon: PaletteIcon,
    required: true,
    hidden: true,
    startAt: "Init" /* Init */,
    settings: settings3,
    start() {
      applyAll();
      document.addEventListener("DOMContentLoaded", () => container3(), { once: true });
      window.addEventListener("load", () => container3(), { once: true });
      subscribe("navigate", () => {
        if (listStyles().some((style) => style.enabled && style.sections.some(isPathDependent)))
          applyAll();
      });
      setTimeout(() => void checkUpdates(), 1e4);
    }
  });

  // src/plugins/_core/userStyles/ui.ts
  var FILTERS = [
    { value: "all", label: "全部" },
    { value: "enabled", label: "已启用" },
    { value: "disabled", label: "未启用" },
    { value: "online", label: "在线" },
    { value: "local", label: "本地" }
  ];
  var IMPORT_ACCEPT = ".css,.styl,.json,text/css,application/json";
  var configurable = (style) => Object.keys(style.vars).length > 0 && SUPPORTED_PREPROCESSORS.has(style.preprocessor) && hasUserCssMeta(style.source);
  function report(added, updated, problems) {
    const done = [added && `新增 ${added} 个`, updated && `更新 ${updated} 个`].filter(Boolean).join("，");
    if (done)
      showToast(`已导入主题：${done}`, "success");
    for (const problem of problems)
      showToast(problem, "error");
  }
  function importOne(style, problems) {
    if (!appliesToSite(style.sections)) {
      problems.push(`「${style.name}」不作用于 linux.do，已跳过`);
      return null;
    }
    return installStyle(style);
  }
  function fromBackup(entry) {
    if (entry.sourceCode && SUPPORTED_PREPROCESSORS.has(entry.preprocessor ?? "") && hasUserCssMeta(entry.sourceCode)) {
      return buildStyle({ source: entry.sourceCode, vars: entry.vars, enabled: entry.enabled });
    }
    return buildStyle({ source: sectionsToSource(entry.sections), name: entry.name, author: entry.author, description: entry.description, enabled: entry.enabled });
  }
  var isScoped = (entry) => entry.sections.some((section) => section.domains || section.urlPrefixes || section.urls || section.regexps);
  function openBackupPicker(entries, rerender) {
    const chosen = new Set(entries.filter(isScoped));
    const row = (entry) => {
      const input = h("input", { type: "checkbox", checked: chosen.has(entry) });
      input.addEventListener("change", () => {
        if (input.checked)
          chosen.add(entry);
        else
          chosen.delete(entry);
      });
      const global = !isScoped(entry);
      const kind = entry.preprocessor ? `UserCSS · ${entry.preprocessor}` : "经典样式";
      return h("li", null, h("label", { class: "ldpp-check" }, input, h("span", { class: "ldpp-backup-name" }, entry.name), h("span", { class: "ldpp-muted" }, global ? `${kind} · 全局（作用于所有网站）` : kind)));
    };
    openDialog({
      title: "从 Stylus 备份导入",
      icon: UploadIcon(18),
      info: "列出备份中作用于 linux.do 的样式。全局样式（没有 @-moz-document 限定）在 Stylus 里对所有网站生效，默认不勾选。使用 stylus / less 预处理器的样式按备份里已编译的结果导入，变量不能再调整。",
      size: "medium",
      body: h("ul", { class: "ldpp-backup-list" }, entries.map(row)),
      actions: [
        { label: "取消" },
        {
          label: "导入所选",
          kind: "primary",
          onClick: () => {
            let added = 0, updated = 0;
            const problems = [];
            for (const entry of chosen) {
              try {
                const result = importOne(fromBackup(entry), problems);
                if (result === "added")
                  added++;
                else if (result === "updated")
                  updated++;
              } catch (error) {
                problems.push(`「${entry.name}」导入失败：${errorMessage(error)}`);
              }
            }
            report(added, updated, problems);
            rerender();
          }
        }
      ]
    });
  }
  async function importFiles(rerender) {
    let files;
    try {
      files = await pickFiles(IMPORT_ACCEPT, true);
    } catch (error) {
      if (!isAbortError(error))
        showToast(errorMessage(error), "error");
      return;
    }
    let added = 0, updated = 0;
    const problems = [];
    for (const file of files) {
      const text = await file.text();
      try {
        if (/\.json$/i.test(file.name) || /^\s*[[{]/.test(text)) {
          const backup = readStylusBackup(JSON.parse(text));
          if (!backup)
            throw new Error("不是 Stylus 备份文件");
          const relevant = backup.filter((entry) => appliesToSite(entry.sections));
          if (!relevant.length)
            throw new Error(`备份中的 ${backup.length} 个样式都不作用于 linux.do`);
          openBackupPicker(relevant, rerender);
          continue;
        }
        const style = buildStyle({ source: text, name: file.name.replace(/(\.user)?\.(css|styl)$/i, "") });
        const result = importOne(style, problems);
        if (result === "added")
          added++;
        else if (result === "updated")
          updated++;
      } catch (error) {
        problems.push(`「${file.name}」导入失败：${errorMessage(error)}`);
      }
    }
    report(added, updated, problems);
    rerender();
  }
  function openUrlDialog(rerender) {
    const error = h("p", { class: "ldpp-field-error" });
    let url = "";
    const input = TextInput({ value: "", placeholder: "https://…/样式.user.css", onInput: (value) => {
      url = value.trim();
    } });
    openDialog({
      title: "从网址安装",
      icon: LinkIcon(18),
      info: "支持 userstyles.world、Greasy Fork、GitHub 等处的 .user.css 链接。安装后每天自动检查一次更新，变量的选择会保留。",
      size: "medium",
      body: h("div", { class: "ldpp-theme-url" }, Field("样式网址", h("span", { class: "ldpp-field-control ldpp-field-wide" }, input, error))),
      actions: [
        { label: "取消" },
        {
          label: "安装",
          kind: "primary",
          onClick: async () => {
            error.textContent = "";
            if (!/^https?:\/\//i.test(url)) {
              error.textContent = "请输入以 http(s):// 开头的网址";
              return false;
            }
            try {
              const source = await fetchStyleSource(url);
              const style = buildStyle({ source, origin: "online", url, name: url.split("/").pop()?.replace(/(\.user)?\.css.*$/i, "") });
              const problems = [];
              const result = importOne(style, problems);
              if (!result)
                throw new Error(problems[0]);
              showToast(`${result === "added" ? "已安装" : "已更新"}主题「${style.name}」`, "success");
              rerender();
              return true;
            } catch (failure) {
              error.textContent = errorMessage(failure);
              return false;
            }
          }
        }
      ]
    });
  }
  function openEditDialog(style, rerender) {
    let source = style?.source ?? "";
    let name = style?.name ?? "";
    const error = h("p", { class: "ldpp-field-error" });
    const nameField = Field("名称", h("span", { class: "ldpp-field-control ldpp-field-wide" }, TextInput({ value: name, placeholder: "新主题", onInput: (value) => {
      name = value;
    } })));
    const syncName = () => {
      nameField.hidden = hasUserCssMeta(source);
    };
    const editor = CssEditor({
      value: source,
      placeholder: `在这里写 CSS，不写 @-moz-document 时作用于 linux.do 全站。
也可以粘贴 Stylus 的 UserCSS（==UserStyle== 元数据、@var 变量）。`,
      onChange: (value) => {
        source = value;
        syncName();
      }
    });
    syncName();
    openDialog({
      title: style ? `编辑主题「${style.name}」` : "新建主题",
      icon: PencilIcon(18),
      info: "支持 Stylus 的 UserCSS 格式：==UserStyle== 元数据（有 @name 时以它为名称）、@var 变量（预处理器 default / uso）、@-moz-document 限定范围。",
      back: "返回设置",
      size: "large",
      className: "ldpp-theme-edit",
      body: [nameField, error, editor.el],
      actions: [
        { label: "取消" },
        {
          label: "保存",
          kind: "primary",
          onClick: () => {
            error.textContent = "";
            try {
              const built = buildStyle({ source, name: name.trim() || "新主题", previous: style ?? undefined });
              if (style)
                updateStyle(style.id, built);
              else
                installStyle(built);
              rerender();
              return true;
            } catch (failure) {
              error.textContent = errorMessage(failure);
              return false;
            }
          }
        }
      ]
    });
    requestAnimationFrame(() => editor.textarea.focus());
  }
  function toHex(value) {
    const rgb = colorToRgb(value);
    return rgb ? `#${rgb.split(",").map((part) => Number(part).toString(16).padStart(2, "0")).join("")}` : "#000000";
  }
  function varControl(variable, set) {
    const current = String(variable.value ?? variable.default);
    switch (variable.type) {
      case "select":
      case "dropdown":
      case "image":
        return Select(current, (variable.options ?? []).map((option) => ({ label: option.label, value: option.name })), set);
      case "checkbox":
        return Switch(current === "1", (on) => set(on ? "1" : "0"), variable.label);
      case "number":
      case "range":
        return NumberInput({ value: Number(current), min: variable.min, max: variable.max, step: variable.step, unit: variable.units, onChange: set });
      case "color": {
        const picker = h("input", { type: "color", class: "ldpp-color-swatch", value: toHex(current), title: "选择颜色" });
        const text = TextInput({ value: current, onInput: (value) => {
          picker.value = toHex(value);
          set(value);
        } });
        picker.addEventListener("input", () => {
          text.value = picker.value;
          set(picker.value);
        });
        return h("span", { class: "ldpp-color-field" }, picker, text);
      }
      default:
        return TextInput({ value: current, onInput: set });
    }
  }
  function openVarsDialog(style, rerender) {
    let vars = plain(style.vars);
    const apply = debounce(() => {
      const current = getStyle(style.id);
      if (!current)
        return;
      try {
        updateStyle(style.id, recompile(current, vars));
      } catch (error) {
        showToast(`「${style.name}」编译失败：${errorMessage(error)}`, "error");
      }
    }, 250);
    const list = h("div", { class: "ldpp-settings-form ldpp-theme-vars" });
    const render = () => list.replaceChildren(...Object.values(vars).map((variable) => {
      const field = Field(variable.label, h("span", { class: classes("ldpp-theme-var-control", variable.type === "checkbox" && "is-switch") }, varControl(variable, (value) => {
        vars[variable.name] = { ...vars[variable.name], value };
        apply();
      })));
      field.title = `${variable.name} = ${varValue(variable)}`;
      return field;
    }));
    render();
    openDialog({
      title: style.name,
      icon: PaletteIcon(18),
      back: "返回设置",
      size: "large",
      className: "ldpp-plugin-dialog",
      body: [
        style.description ? h("p", { class: "ldpp-plugin-dialog-desc" }, style.description) : null,
        h("h3", { class: "ldpp-plugin-dialog-label" }, `变量（${Object.keys(vars).length}）`),
        list
      ],
      actions: [{
        label: "恢复默认",
        onClick: async () => {
          if (!await confirmDialog(`把「${style.name}」的全部变量恢复为默认值？`, { title: "恢复默认变量", danger: true, icon: RefreshIcon(18), okLabel: "恢复" }))
            return false;
          vars = Object.fromEntries(Object.entries(vars).map(([name, variable]) => [name, { ...variable, value: null }]));
          render();
          apply();
          return false;
        }
      }],
      onClose: rerender
    });
  }
  function themeCard(style, rerender) {
    const online = style.origin === "online";
    const meta = [style.author, style.version && `v${style.version}`].filter(Boolean).join(" · ");
    return h("article", { class: classes("ldpp-plugin-card", "ldpp-theme-card", !style.enabled && "is-off"), dataset: { style: style.id } }, h("div", { class: "ldpp-plugin-card-body" }, h("div", { class: "ldpp-plugin-card-head" }, h("div", { class: "ldpp-plugin-card-name" }, h("span", { class: "ldpp-plugin-card-icon" }, PaletteIcon(14)), h("span", { class: "ldpp-plugin-card-title", title: style.name }, style.name)), h("div", { class: "ldpp-plugin-card-controls" }, configurable(style) ? IconButton(SlidersIcon(), { title: "变量", className: "ldpp-row-btn", onClick: () => openVarsDialog(style, rerender) }) : null, online ? IconButton(CopyIcon(), { title: "复制网址", className: "ldpp-row-btn", onClick: () => void copyText(style.url ?? "").then(() => showToast("已复制网址", "success")) }) : IconButton(PencilIcon(), { title: "编辑", className: "ldpp-row-btn", onClick: () => openEditDialog(style, rerender) }), IconButton(TrashIcon(), {
      title: "删除",
      className: "ldpp-row-btn ldpp-theme-remove",
      onClick: async () => {
        if (!await confirmDialog(`确定删除主题「${style.name}」吗？`, { title: "删除主题", danger: true, okLabel: "删除" }))
          return;
        removeStyle(style.id);
        rerender();
      }
    }), Switch(style.enabled, (value) => {
      updateStyle(style.id, { enabled: value });
      rerender();
    }, style.name))), h("p", { class: "ldpp-plugin-card-desc", title: style.description ?? "" }, style.description ?? " ")), h("div", { class: "ldpp-plugin-card-footer ldpp-theme-card-footer" }, online ? GlobeIcon(12) : FolderIcon(12), h("span", null, meta || (online ? "在线主题" : "本地主题"))));
  }
  function renderThemesTab() {
    let query = "";
    let filter = "all";
    const root = h("div", { class: "ldpp-themes" });
    const grid = trackScrollbar(h("div", { class: "ldpp-plugins-grid" }));
    const search = h("input", { type: "search", class: "ldpp-input ldpp-plugins-search" });
    const select = h("select", { class: "ldpp-input ldpp-plugins-filter" }, FILTERS.map((option) => h("option", { value: option.value }, option.label)));
    const toolbar = h("div", { class: "ldpp-plugins-toolbar" }, search, select);
    const rerender = () => {
      const all = listStyles();
      search.placeholder = `搜索 ${all.length} 个主题…`;
      toolbar.hidden = !all.length;
      const needle = query.trim().toLowerCase();
      const visible = all.filter((style) => (filter === "all" || filter === "enabled" && style.enabled || filter === "disabled" && !style.enabled || filter === "online" && style.origin === "online" || filter === "local" && style.origin === "local") && (!needle || `${style.name} ${style.description ?? ""} ${style.author ?? ""}`.toLowerCase().includes(needle)));
      grid.replaceChildren(...visible.map((style) => themeCard(style, rerender)));
      if (!visible.length)
        grid.append(h("p", { class: "ldpp-muted ldpp-plugins-empty" }, all.length ? "没有匹配的主题。" : "还没有主题。可以从网址安装，或导入 Stylus 样式。"));
    };
    search.addEventListener("input", () => {
      query = search.value;
      rerender();
    });
    select.addEventListener("change", () => {
      filter = select.value;
      rerender();
    });
    root.append(h("div", { class: "ldpp-themes-row" }, h("span", { class: "ldpp-field-label" }, "在线主题", InfoTip("从网址安装 Stylus 样式（.user.css），每天自动检查一次更新。")), Button("从网址安装", { icon: LinkIcon(), onClick: () => openUrlDialog(rerender) })), h("div", { class: "ldpp-themes-row" }, h("span", { class: "ldpp-field-label" }, "本地主题", InfoTip("导入 Stylus 的 .user.css 文件（可多选），或 Stylus「备份」导出的 JSON（会列出其中作用于 linux.do 的样式）；也可以新建空白主题直接写 CSS。只保存在本机，「数据」页的备份会包含它们。")), h("span", { class: "ldpp-themes-actions" }, Button("导入 Stylus 样式", { icon: UploadIcon(), onClick: () => void importFiles(rerender) }), Button("新建", { icon: PlusIcon(), onClick: () => openEditDialog(null, rerender) }))), toolbar, grid);
    rerender();
    return root;
  }
  function renderQuickCssTab() {
    const save = debounce((css) => setQuickCss(css), 200);
    const editor = CssEditor({
      value: String(settings3.store.quickCss ?? ""),
      placeholder: `在这里写 CSS，输入即生效。例如：
.d-header { box-shadow: none; }`,
      disabled: settings3.store.quickCssEnabled === false,
      onChange: save
    });
    return h("div", { class: "ldpp-quick-css" }, Field("启用快速 CSS", Switch(settings3.store.quickCssEnabled !== false, (value) => {
      setQuickCssEnabled(value);
      editor.setDisabled(!value);
    }, "启用快速 CSS"), "输入即生效，只保存在本机；关闭后代码保留但不再应用。快速 CSS 排在所有主题之后，可以覆盖它们。"), editor.el);
  }

  // ldpp-css:src/plugins/keywordSearch/styles.css
  registerStyle("keywordSearch", `/* The \uD83C\uDFF7️ in the search page's field sits left of Discourse's clear ×, which is placed the same way (absolute, 8px). */
.ldpp-kws-toggle.is-in-field {
    position: absolute;
    top: 50%;
    right: 2rem;
    z-index: 1;
    transform: translateY(-50%);
}

/* Room for the \uD83C\uDFF7️ and the ×: Discourse's own \`.search-container .search-bar__field input.search-query\` leaves 2em. */
.search-container .search-bar__field:has(> .ldpp-kws-toggle) > input.search-query {
    padding-inline-end: 4.75rem;
}

.ldpp-kws-toggle {
    font-size: 1rem;
    line-height: 1;
}

/* Under the search box, in the page (it scrolls with it), below the header and LD++'s dialogs. */
.ldpp-kws-panel {
    position: absolute;
    z-index: 980;
    box-sizing: border-box;
    max-height: 60vh;
    padding: 0.6rem 0.75rem 0.75rem;
    overflow-y: auto;
    border: 1px solid var(--ldpp-line);
    border-radius: var(--ldpp-radius);
    background: var(--ldpp-bg);
    box-shadow: var(--ldpp-shadow);
    color: var(--ldpp-fg);
    overscroll-behavior: contain;
}

.ldpp-kws-head {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-bottom: 0.6rem;
}

.ldpp-kws-tabs {
    display: flex;
    flex: 1 1 auto;
    gap: 0.25rem;
    padding: 0.2rem;
    border-radius: 8px;
    background: var(--ldpp-soft);
}

.ldpp-kws-tab {
    display: inline-flex;
    flex: 1 1 0;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0.3rem 0.5rem;
    border: 0;
    border-radius: var(--ldpp-btn-radius);
    background: transparent;
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
    cursor: pointer;
}

@media (hover: hover) {
    .ldpp-kws-tab:not(.is-active):hover {
        background: var(--ldpp-flat-bg-hover);
        color: var(--ldpp-flat-text-hover);
    }
}

.ldpp-kws-tab.is-active {
    background: var(--ldpp-bg);
    color: var(--ldpp-fg);
    font-weight: 600;
    box-shadow: 0 1px 2px rgb(0 0 0 / 15%);
}

.ldpp-kws-count {
    color: var(--ldpp-muted);
    font-weight: 400;
    font-variant-numeric: tabular-nums;
}

.ldpp-kws-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

/* A chip: the search / open action, then its ✎. */
.ldpp-kws-chip {
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    border: 1px solid var(--ldpp-line);
    border-radius: 999px;
    background: var(--ldpp-soft);
}

.ldpp-kws-chip-main {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
    margin: 0;
    padding: 0.25rem 0.2rem 0.25rem 0.7rem;
    border: 0;
    border-radius: 999px 0 0 999px;
    background: transparent;
    color: var(--ldpp-fg);
    font: inherit;
    font-size: var(--ldpp-font-sm);
    text-align: left;
    cursor: pointer;
}

.ldpp-kws-chip-main:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.ldpp-kws-chip-text {
    min-width: 0;
    overflow-wrap: anywhere;
}

@media (hover: hover) {
    .ldpp-kws-chip-main:not(:disabled):hover {
        color: var(--ldpp-flat-text-hover);
    }

    .ldpp-kws-chip:has(> .ldpp-kws-chip-main:not(:disabled):hover) {
        background: var(--ldpp-flat-bg-hover);
    }
}

.ldpp-icon-btn.ldpp-kws-chip-edit {
    flex: none;
    width: 1.6rem;
    height: 1.6rem;
    margin-right: 0.15rem;
    border-radius: 50%;
}

/* The order's badge, in its colour (the old script's colours, editable in the settings). */
.ldpp-kws-badge {
    display: inline-flex;
    align-items: center;
    padding: 0 0.45rem;
    border-radius: 999px;
    color: #fff;
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.5;
    white-space: nowrap;
}

.ldpp-kws-empty {
    margin: 0.25rem 0;
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
}

.ldpp-kws-colors {
    display: flex;
    flex-direction: column;
}

/* In the settings' control column, like the other fields: the script's preview chip, its colour at the right end. */
.ldpp-field-head > .ldpp-field-control.ldpp-kws-color {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 0.6rem;
}

.ldpp-kws-preview {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    max-width: 100%;
    padding: 0.25rem 0.4rem 0.25rem 0.7rem;
    border: 1px solid;
    border-radius: 999px;
    background: var(--ldpp-soft);
    color: var(--ldpp-fg);
    font-size: var(--ldpp-font-sm);
    white-space: nowrap;
}

.ldpp-kws-color > .ldpp-kws-color-input {
    flex: none;
    margin-inline-start: auto;
}

.ldpp-kws-color-input {
    width: 1.75rem;
    height: 1.75rem;
    margin: 0;
    padding: 0;
    border: 1px solid var(--ldpp-line);
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
}
`);

  // src/plugins/keywordSearch/model.ts
  var SORT_OPTIONS = [
    { id: "relevance", name: "相关性", token: "", color: "#00a1d6" },
    { id: "latest", name: "最新帖子", token: "order:latest", color: "#fb7299" },
    { id: "likes", name: "赞最多", token: "order:likes", color: "#ff9f29" },
    { id: "views", name: "浏览最多", token: "order:views", color: "#6966ff" },
    { id: "latest_topic", name: "最新话题", token: "order:latest_topic", color: "#8e44ad" },
    { id: "read", name: "最近阅读", token: "order:read", color: "#6dc781" }
  ];
  var sortOption = (id) => SORT_OPTIONS.find((option) => option.id === id) ?? SORT_OPTIONS[0];
  function normalizeSort(raw) {
    const id = String(raw ?? "").trim();
    return SORT_OPTIONS.some((option) => option.id === id) ? id : "relevance";
  }
  var text = (value) => (typeof value === "string" ? value : String(value ?? "")).trim();
  function normalizeKeywords(raw) {
    if (!Array.isArray(raw))
      return [];
    const seen = new Set;
    const out = [];
    for (const item of raw) {
      const keyword = text(typeof item === "string" ? item : isObject(item) ? item.keyword : "");
      const sort = normalizeSort(isObject(item) ? isObject(item.filters) ? item.filters.sort : item.sort : "");
      const key = `${keyword.toLowerCase()}::${sort}`;
      if (!keyword || seen.has(key))
        continue;
      seen.add(key);
      out.push({ keyword, sort });
    }
    return out;
  }
  var BLOCKED_PROTOCOLS = new Set(["javascript:", "data:", "vbscript:"]);
  function resolveLink(raw, base = location.href) {
    const value = raw.trim();
    if (!value)
      return "";
    const bareDomain = /^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|(?:[\w-]+\.)+[a-z]{2,})(?::\d+)?(?:[/?#]|$)/i.test(value);
    const candidate = value.startsWith("//") ? `${new URL(base).protocol}${value}` : bareDomain ? `https://${value}` : value;
    try {
      const url = new URL(candidate, new URL("/", base));
      return BLOCKED_PROTOCOLS.has(url.protocol.toLowerCase()) ? "" : url.href;
    } catch {
      return "";
    }
  }
  function normalizeLinks(raw, base = location.href) {
    if (!Array.isArray(raw))
      return [];
    const seen = new Set;
    const out = [];
    for (const item of raw) {
      const label = isObject(item) ? text(item.label ?? item.title) : "";
      const url = text(typeof item === "string" ? item : isObject(item) ? item.url ?? item.linkUrl ?? item.href : "");
      const key = resolveLink(url, base) || url.toLowerCase();
      if (!url || seen.has(key))
        continue;
      seen.add(key);
      out.push({ label, url });
    }
    return out;
  }
  function linkLabel(entry, base = location.href) {
    if (entry.label.trim())
      return entry.label.trim();
    const href = resolveLink(entry.url, base);
    if (!href)
      return entry.url || "链接";
    const url = new URL(href);
    if (url.protocol === "mailto:" || url.protocol === "tel:")
      return href.replace(/^[a-z]+:/i, "");
    const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    return `${url.host}${path}${url.search}${url.hash}` || href;
  }
  function searchPath(entry) {
    const query = [entry.keyword.trim(), sortOption(entry.sort).token].filter(Boolean).join(" ");
    return `/search?q=${encodeURIComponent(query)}`;
  }
  function parseKeywordExport(raw) {
    if (Array.isArray(raw)) {
      const keywords = normalizeKeywords(raw);
      return keywords.length && raw.every((item) => typeof item === "string" || isObject(item) && ("keyword" in item)) ? { keywords } : null;
    }
    if (!isObject(raw) || !(Array.isArray(raw.keywords) || Array.isArray(raw.links)))
      return null;
    if (Array.isArray(raw.keywords) && raw.keywords.some((item) => !(typeof item === "string" || isObject(item) && ("keyword" in item))))
      return null;
    return {
      keywords: Array.isArray(raw.keywords) ? normalizeKeywords(raw.keywords) : undefined,
      links: Array.isArray(raw.links) ? normalizeLinks(raw.links) : undefined
    };
  }
  function toExport(keywords, links) {
    return {
      keywords: keywords.map((entry) => ({ keyword: entry.keyword, filters: { sort: entry.sort } })),
      links: links.map((entry) => ({ label: entry.label, url: entry.url }))
    };
  }

  // src/plugins/keywordSearch/index.ts
  var TOGGLE = "ldpp-kws-toggle";
  var LEGACY_BUTTON = "#ld-kse-keyword-tag-button";
  var settings4 = definePluginSettings({
    keywords: { type: 6 /* CUSTOM */, default: [] },
    links: { type: 6 /* CUSTOM */, default: [] },
    sortColors: { type: 6 /* CUSTOM */, default: {} },
    defaultSort: {
      type: 3 /* SELECT */,
      description: "新增关键词时的默认排序",
      options: SORT_OPTIONS.map((option) => ({ label: option.name, value: option.id, default: option.id === "relevance" }))
    },
    colors: {
      type: 5 /* COMPONENT */,
      description: "排序标签颜色",
      render: () => renderColors()
    },
    data: {
      type: 5 /* COMPONENT */,
      description: "导入 / 导出",
      render: () => renderDataTools()
    }
  });
  var keywords = () => normalizeKeywords(settings4.store.keywords);
  var links = () => normalizeLinks(settings4.store.links);
  var saveKeywords = (next) => {
    settings4.store.keywords = normalizeKeywords(next);
  };
  var saveLinks = (next) => {
    settings4.store.links = normalizeLinks(next);
  };
  function sortColor(id) {
    const custom = settings4.store.sortColors?.[id];
    return typeof custom === "string" && /^#[\da-f]{6}$/i.test(custom) ? custom : sortOption(id).color;
  }
  function badge(id) {
    return h("span", { class: "ldpp-kws-badge", style: { "background-color": sortColor(id) } }, sortOption(id).name);
  }
  var tab = "keywords";
  var panel = null;
  var anchor = null;
  function go(path) {
    closePanel();
    const url = new URL(path, location.origin);
    if (url.origin === location.origin)
      routeTo(url.pathname + url.search + url.hash);
    else
      location.assign(url.href);
  }
  function chip(main, onEdit, editTitle) {
    return h("li", { class: "ldpp-kws-chip" }, main, IconButton(PencilIcon(12), { title: editTitle, className: "ldpp-kws-chip-edit", onClick: onEdit }));
  }
  function renderList() {
    if (tab === "keywords") {
      const list = keywords();
      if (!list.length)
        return h("p", { class: "ldpp-kws-empty" }, "还没有关键词。点右上角 ＋ 添加，或在设置里导入旧脚本导出的文件。");
      return h("ul", { class: "ldpp-kws-chips" }, list.map((entry, index) => chip(h("button", { type: "button", class: "ldpp-kws-chip-main", title: `搜索「${entry.keyword}」（${sortOption(entry.sort).name}）`, on: { click: () => go(searchPath(entry)) } }, h("span", { class: "ldpp-kws-chip-text" }, `\uD83D\uDD0D ${entry.keyword}`), badge(entry.sort)), () => editKeyword(index), "编辑关键词")));
    }
    const list = links();
    if (!list.length)
      return h("p", { class: "ldpp-kws-empty" }, "还没有链接。点右上角 ＋ 把当前页面或任意地址加进来。");
    return h("ul", { class: "ldpp-kws-chips" }, list.map((entry, index) => {
      const href = resolveLink(entry.url);
      return chip(h("button", { type: "button", class: "ldpp-kws-chip-main", title: href || "链接无效", disabled: !href, on: { click: () => go(href) } }, h("span", { class: "ldpp-kws-chip-text" }, `\uD83D\uDD17 ${linkLabel(entry)}`)), () => editLink(index), "编辑链接");
    }));
  }
  function renderPanel() {
    if (!panel)
      return;
    const tabButton = (id, label, count) => h("button", {
      type: "button",
      class: classes("ldpp-kws-tab", tab === id && "is-active"),
      attrs: { role: "tab", "aria-selected": String(tab === id) },
      on: { click: () => {
        tab = id;
        renderPanel();
      } }
    }, label, count ? h("span", { class: "ldpp-kws-count" }, String(count)) : null);
    panel.replaceChildren(h("div", { class: "ldpp-kws-head" }, h("div", { class: "ldpp-kws-tabs", attrs: { role: "tablist" } }, tabButton("keywords", "关键词", keywords().length), tabButton("links", "链接", links().length)), IconButton(PlusIcon(16), { title: tab === "keywords" ? "新增关键词" : "新增链接", onClick: () => tab === "keywords" ? editKeyword(-1) : editLink(-1) }), IconButton(SettingsIcon(16), { title: "设置", onClick: () => {
      closePanel();
      dispatch("openSettings", { tab: "features", plugin: "KeywordSearch" });
    } })), renderList());
  }
  function placePanel() {
    if (!panel || !anchor?.isConnected)
      return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 320), window.innerWidth - 32);
    const left = Math.min(Math.max(16, rect.left), window.innerWidth - width - 16);
    panel.style.width = `${width}px`;
    panel.style.left = `${left + window.scrollX}px`;
    panel.style.top = `${rect.bottom + window.scrollY + 8}px`;
  }
  function openPanel(from) {
    anchor = from.closest(".search-input, .search-bar") ?? from;
    panel ??= mark(h("section", { class: "ldpp-kws-panel", attrs: { "aria-label": "常用关键词与链接" } }), "keyword-search");
    if (!panel.isConnected)
      document.body.append(panel);
    renderPanel();
    placePanel();
    syncToggles();
  }
  function closePanel() {
    panel?.remove();
    panel = null;
    syncToggles();
  }
  function syncToggles() {
    for (const toggle of document.querySelectorAll(`.${TOGGLE}`))
      toggle.setAttribute("aria-expanded", String(Boolean(panel)));
  }
  function onToggle(event) {
    event.preventDefault();
    event.stopPropagation();
    if (panel)
      closePanel();
    else
      openPanel(event.currentTarget);
  }
  function editKeyword(index) {
    const list = keywords();
    const current = list[index];
    let keyword = current?.keyword ?? "";
    let sort = current?.sort ?? normalizeSort(settings4.store.defaultSort);
    const input = TextInput({ value: keyword, placeholder: "关键词", onInput: (value) => {
      keyword = value;
    } });
    const save = () => {
      const value = keyword.trim();
      if (!value) {
        showToast("关键词不能为空", "warning");
        return false;
      }
      if (list.some((entry, i) => i !== index && entry.keyword === value && entry.sort === sort)) {
        showToast("相同排序下已经有这个关键词", "warning");
        return false;
      }
      const next = [...list];
      if (current)
        next[index] = { keyword: value, sort };
      else
        next.push({ keyword: value, sort });
      saveKeywords(next);
      renderPanel();
      return true;
    };
    const handle = openDialog({
      title: current ? "编辑关键词" : "新增关键词",
      icon: SearchIcon(18),
      size: "small",
      body: [
        Field("关键词", input),
        Field("排序", Select(sort, SORT_OPTIONS.map((option) => ({ label: option.name, value: option.id })), (value) => {
          sort = normalizeSort(value);
        }))
      ],
      actions: [
        ...current ? [{ label: "删除", kind: "delete", onClick: () => {
          saveKeywords(list.filter((_, i) => i !== index));
          renderPanel();
        } }] : [],
        { label: "取消" },
        { label: current ? "保存" : "新增", kind: "primary", onClick: save }
      ]
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.isComposing && save())
        handle.close();
    });
    requestAnimationFrame(() => input.focus());
  }
  var pageTitle = () => document.title.replace(/\s*-\s*LINUX DO\s*$/i, "").trim();
  function editLink(index) {
    const list = links();
    const current = list[index];
    let label = current?.label ?? "";
    let url = current?.url ?? location.href;
    const labelInput = TextInput({ value: label, placeholder: current ? "可选" : pageTitle() || "可选", onInput: (value) => {
      label = value;
    } });
    const urlInput = TextInput({ value: url, placeholder: "网址、域名或站内路径", onInput: (value) => {
      url = value;
    } });
    const save = () => {
      const href = resolveLink(url);
      if (!href) {
        showToast(url.trim() ? "请输入有效的链接地址" : "链接地址不能为空", "warning");
        return false;
      }
      if (list.some((entry, i) => i !== index && resolveLink(entry.url) === href)) {
        showToast("这个链接已经存在", "warning");
        return false;
      }
      const name = label.trim() || (!current && href === resolveLink(location.href) ? pageTitle() : "");
      const next = [...list];
      if (current)
        next[index] = { label: name, url: url.trim() };
      else
        next.push({ label: name, url: url.trim() });
      saveLinks(next);
      renderPanel();
      return true;
    };
    const handle = openDialog({
      title: current ? "编辑链接" : "新增链接",
      icon: LinkIcon(18),
      size: "small",
      body: [Field("标签", labelInput), Field("链接地址", urlInput)],
      actions: [
        ...current ? [{ label: "删除", kind: "delete", onClick: () => {
          saveLinks(list.filter((_, i) => i !== index));
          renderPanel();
        } }] : [],
        { label: "取消" },
        { label: current ? "保存" : "新增", kind: "primary", onClick: save }
      ]
    });
    for (const input of [labelInput, urlInput]) {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.isComposing && save())
          handle.close();
      });
    }
    requestAnimationFrame(() => {
      urlInput.focus();
      urlInput.select();
    });
  }
  function renderColors() {
    const root = h("div", { class: "ldpp-kws-colors" });
    const render = () => {
      root.replaceChildren(...SORT_OPTIONS.map((option) => {
        const tag = badge(option.id);
        const preview = h("span", { class: "ldpp-kws-preview", style: { "border-color": sortColor(option.id) } }, h("span", null, "\uD83D\uDD0D 颜色预览"), tag);
        const picker = h("input", { type: "color", class: "ldpp-kws-color-input", value: sortColor(option.id), title: `${option.name}的颜色` });
        picker.addEventListener("input", () => {
          preview.style.borderColor = picker.value;
          tag.style.backgroundColor = picker.value;
        });
        picker.addEventListener("change", () => {
          settings4.store.sortColors = { ...settings4.store.sortColors, [option.id]: picker.value };
          if (panel)
            renderPanel();
        });
        return Field(option.name, h("span", { class: "ldpp-field-control ldpp-kws-color" }, preview, picker));
      }), h("div", { class: "ldpp-row-actions" }, Button("恢复默认颜色", { small: true, onClick: () => {
        settings4.store.sortColors = {};
        render();
        if (panel)
          renderPanel();
      } })));
    };
    render();
    return root;
  }
  function importKeywordFile(raw) {
    const parsed = parseKeywordExport(raw);
    if (!parsed)
      return null;
    const before = { keywords: keywords().length, links: links().length };
    if (parsed.keywords)
      saveKeywords([...keywords(), ...parsed.keywords]);
    if (parsed.links)
      saveLinks([...links(), ...parsed.links]);
    return { keywords: keywords().length - before.keywords, links: links().length - before.links };
  }
  async function importFromFile() {
    let raw;
    try {
      raw = await pickJsonFile();
    } catch (error) {
      if (!isAbortError(error))
        showToast(errorMessage(error), "warning");
      return;
    }
    const added = importKeywordFile(raw);
    if (!added) {
      showToast("无法识别的文件：不是「Keywords Search Enhanced」或 LD++ 导出的关键词文件", "error");
      return;
    }
    showToast(`导入完成：新增 ${added.keywords} 个关键词、${added.links} 个链接（重复的已跳过）`, "success");
    if (panel)
      renderPanel();
  }
  function exportToFile() {
    downloadJson(toExport(keywords(), links()), `linuxdo_Keywords_Search_${todayStamp()}.json`);
  }
  function renderDataTools() {
    return Field("关键词与链接文件", h("span", { class: "ldpp-inline-controls" }, Button("导入", { small: true, onClick: () => void importFromFile() }), Button("导出", { small: true, onClick: exportToFile }), InfoTip("文件格式与原脚本「Keywords Search Enhanced」的导出文件相同，两边可以互相导入。导入时与现有列表合并，重复的关键词（同一排序）和链接会跳过。")));
  }
  function placeToggles() {
    for (const row of document.querySelectorAll(".search-input .searching")) {
      if (row.querySelector(`:scope > .${TOGGLE}`))
        continue;
      row.insertBefore(toggleButton("btn no-text btn-icon btn-transparent"), row.querySelector(":scope > .show-advanced-search"));
    }
    for (const field of document.querySelectorAll(".search-bar__field")) {
      if (!field.querySelector(`:scope > .${TOGGLE}`))
        field.append(toggleButton("btn no-text btn-icon btn-transparent is-in-field"));
    }
    if (!warnedLegacy && document.querySelector(LEGACY_BUTTON)) {
      warnedLegacy = true;
      showToast("「Keywords Search Enhanced」脚本仍在运行，搜索框里会出现两个 \uD83C\uDFF7️。LD++ 已内置这个功能：先用旧脚本导出数据，在 LD++ 设置里导入，再停用旧脚本。", "warning", { key: "keyword-search-legacy" });
    }
  }
  function toggleButton(className) {
    return mark(h("button", {
      type: "button",
      class: `${className} ${TOGGLE}`,
      title: "常用关键词与链接",
      attrs: { "aria-label": "常用关键词与链接", "aria-expanded": String(Boolean(panel)) },
      on: { click: onToggle }
    }, "\uD83C\uDFF7️"), "keyword-search-toggle");
  }
  var warnedLegacy = false;
  var observer2 = null;
  var listeners2 = null;
  var frame = 0;
  function schedule2() {
    if (!frame)
      frame = requestAnimationFrame(() => {
        frame = 0;
        placeToggles();
      });
  }
  function onPointerDown(event) {
    if (!panel || !(event.target instanceof Element))
      return;
    if (event.target.closest(`.ldpp-kws-panel, .${TOGGLE}, .ldpp-dialog-overlay, .ldpp-toasts`))
      return;
    closePanel();
  }
  var keywordSearch_default = definePlugin({
    name: "KeywordSearch",
    displayName: "关键词搜索增强",
    description: "把常搜的关键词（各带一种排序）和常用链接存起来，点搜索框里的 \uD83C\uDFF7️ 一键搜索、快速打开；支持导入 / 导出原脚本的文件。",
    tags: ["search"],
    icon: TagIcon,
    enabledByDefault: true,
    settings: settings4,
    start() {
      listeners2 = new AbortController;
      document.addEventListener("pointerdown", onPointerDown, { capture: true, signal: listeners2.signal });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && panel && !document.querySelector(".ldpp-dialog-overlay"))
          closePanel();
      }, { signal: listeners2.signal });
      window.addEventListener("resize", placePanel, { signal: listeners2.signal });
      observer2 = new MutationObserver(schedule2);
      observer2.observe(document.body, { childList: true, subtree: true });
      placeToggles();
    },
    stop() {
      observer2?.disconnect();
      observer2 = null;
      listeners2?.abort();
      listeners2 = null;
      if (frame)
        cancelAnimationFrame(frame);
      frame = 0;
      closePanel();
      for (const toggle of document.querySelectorAll(`.${TOGGLE}`))
        toggle.remove();
    },
    onSettingsChange() {
      if (panel)
        renderPanel();
    },
    events: {
      navigate() {
        closePanel();
        schedule2();
      }
    }
  });

  // src/plugins/topicBlocker/rules.ts
  var EMPTY_RULES = { titleKeywords: [], categories: [], tags: [], titleRegex: [], categoryRegex: [], tagRegex: [] };
  var SLASHED = /^\/(.+)\/([dgimsuvy]*)$/s;
  var fold = (value) => normalizeText(value).toLowerCase();
  function parseRegex(pattern) {
    const trimmed = pattern.trim();
    const slashed = trimmed.match(SLASHED);
    return slashed ? new RegExp(slashed[1], slashed[2].replace(/[gy]/g, "")) : new RegExp(trimmed);
  }
  function regexError(pattern) {
    try {
      parseRegex(pattern);
      return null;
    } catch (error) {
      return error.message;
    }
  }
  function normalizeRegexRules(raw) {
    if (!Array.isArray(raw))
      return [];
    const out = [];
    for (const item of raw) {
      const rule = typeof item === "string" ? { pattern: item.trim(), note: "" } : isObject(item) ? { pattern: asString(item.pattern ?? item.value), note: asString(item.note) } : null;
      if (rule?.pattern)
        out.push(rule);
    }
    return out;
  }
  function normalizeRules(raw) {
    const source = isObject(raw) ? raw : {};
    return {
      titleKeywords: dedupe(asStringArray(source.titleKeywords)),
      categories: dedupe(asStringArray(source.categories)),
      tags: dedupe(asStringArray(source.tags)),
      titleRegex: normalizeRegexRules(source.titleRegex),
      categoryRegex: normalizeRegexRules(source.categoryRegex),
      tagRegex: normalizeRegexRules(source.tagRegex)
    };
  }
  function dedupe(values) {
    const seen = new Set;
    return values.filter((value) => {
      const key = fold(value);
      if (!key || seen.has(key))
        return false;
      seen.add(key);
      return true;
    });
  }
  function compileList(rules, invalid) {
    const out = [];
    for (const rule of rules) {
      try {
        out.push({ rule, regex: parseRegex(rule.pattern) });
      } catch {
        invalid.push(rule.pattern);
      }
    }
    return out;
  }
  function compileRules(rules) {
    const invalid = [];
    return {
      titleKeywords: rules.titleKeywords.map((keyword) => [fold(keyword), keyword]),
      categories: new Map(rules.categories.map((value) => [fold(value), value])),
      tags: new Map(rules.tags.map((value) => [fold(value), value])),
      titleRegex: compileList(rules.titleRegex, invalid),
      categoryRegex: compileList(rules.categoryRegex, invalid),
      tagRegex: compileList(rules.tagRegex, invalid),
      invalid
    };
  }
  function testRegex(list, kind, value, out) {
    if (!value)
      return;
    for (const { rule, regex } of list) {
      regex.lastIndex = 0;
      if (regex.test(value))
        out.push({ kind, rule: rule.pattern, matched: value, note: rule.note || undefined });
    }
  }
  function evaluate(compiled, facts) {
    const reasons = [];
    const title = fold(facts.title);
    if (title) {
      for (const [folded, keyword] of compiled.titleKeywords)
        if (folded && title.includes(folded))
          reasons.push({ kind: "titleKeyword", rule: keyword, matched: facts.title });
    }
    testRegex(compiled.titleRegex, "titleRegex", facts.title, reasons);
    const category = compiled.categories.get(fold(facts.category));
    if (facts.category && category)
      reasons.push({ kind: "category", rule: category, matched: facts.category });
    testRegex(compiled.categoryRegex, "categoryRegex", facts.category, reasons);
    for (const tag of facts.tags) {
      const hit = compiled.tags.get(fold(tag));
      if (hit)
        reasons.push({ kind: "tag", rule: hit, matched: tag });
      testRegex(compiled.tagRegex, "tagRegex", tag, reasons);
    }
    return reasons;
  }
  var REASON_LABEL = {
    titleKeyword: "标题关键词",
    titleRegex: "标题正则",
    category: "类别",
    categoryRegex: "类别正则",
    tag: "标签",
    tagRegex: "标签正则"
  };
  var LIST_OF = {
    titleKeyword: "titleKeywords",
    category: "categories",
    tag: "tags",
    titleRegex: "titleRegex",
    categoryRegex: "categoryRegex",
    tagRegex: "tagRegex"
  };
  function withAdditions(rules, additions) {
    return {
      ...rules,
      titleKeywords: dedupe([...rules.titleKeywords, ...additions.titleKeywords ?? []]),
      categories: dedupe([...rules.categories, ...additions.categories ?? []]),
      tags: dedupe([...rules.tags, ...additions.tags ?? []])
    };
  }
  function withoutReasons(rules, reasons) {
    const next = structuredClone(rules);
    for (const reason of reasons) {
      const key = LIST_OF[reason.kind];
      if (key === "titleKeywords" || key === "categories" || key === "tags") {
        next[key] = next[key].filter((value) => fold(value) !== fold(reason.rule));
      } else {
        next[key] = next[key].filter((rule) => rule.pattern !== reason.rule);
      }
    }
    return next;
  }
  function countRules(rules) {
    return Object.values(rules).reduce((sum, list) => sum + list.length, 0);
  }

  // src/plugins/searchFilter/query.ts
  var EMPTY_SEARCH_RULE = { blacklist: [], whitelist: [], regex: [] };
  var DIRECTIVE = /^[a-z_]+:\S+$/i;
  function tokenize(query) {
    const tokens = [];
    let current = "";
    let quote = "";
    for (const char of query) {
      if ((char === '"' || char === "'") && (!quote || quote === char)) {
        quote = quote ? "" : char;
        continue;
      }
      if (!quote && /\s/.test(char)) {
        if (current)
          tokens.push(current);
        current = "";
        continue;
      }
      current += char;
    }
    if (current)
      tokens.push(current);
    return tokens;
  }
  function primaryTerm(query) {
    const raw = normalizeText(query);
    const words = tokenize(raw).filter((token) => /^https?:/i.test(token) || !DIRECTIVE.test(token));
    return words.join(" ").trim() || raw;
  }
  var list2 = (value) => typeof value === "string" ? splitList(value) : asStringArray(value);
  function normalizeSearchRule(raw) {
    if (typeof raw === "string")
      return { ...EMPTY_SEARCH_RULE, blacklist: splitList(raw) };
    if (!isObject(raw))
      return { ...EMPTY_SEARCH_RULE };
    const regex = typeof raw.regex === "string" ? raw.regex.split(`
`).map((line) => line.trim()).filter(Boolean) : asStringArray(raw.regex);
    return { blacklist: list2(raw.blacklist), whitelist: list2(raw.whitelist), regex };
  }
  function normalizeSearchRules(raw) {
    const out = {};
    if (!isObject(raw))
      return out;
    for (const [term, rule] of Object.entries(raw)) {
      const key = normalizeText(term);
      const value = normalizeSearchRule(rule);
      if (key && (value.blacklist.length || value.whitelist.length || value.regex.length))
        out[key] = value;
    }
    return out;
  }
  function keywordMatches(text, keyword) {
    const needle = normalizeText(keyword).toLowerCase();
    if (!needle)
      return false;
    if (!needle.includes(" "))
      return text.toLowerCase().includes(needle);
    return new RegExp(needle.split(" ").map(escapeRegExp).join("\\s+"), "i").test(text);
  }
  function evaluateSearch(rule, text) {
    const out = [];
    for (const keyword of rule.blacklist)
      if (keywordMatches(text, keyword))
        out.push({ kind: "blacklist", value: keyword });
    for (const pattern of rule.regex) {
      try {
        const regex = pattern.startsWith("/") ? parseRegex(pattern) : new RegExp(pattern, "i");
        if (regex.test(text))
          out.push({ kind: "regex", value: pattern });
      } catch {
        continue;
      }
    }
    if (rule.whitelist.length && !rule.whitelist.some((keyword) => keywordMatches(text, keyword)))
      out.push({ kind: "whitelist", value: rule.whitelist.join("、") });
    return out;
  }

  // ldpp-css:src/plugins/searchFilter/styles.css
  registerStyle("searchFilter", `.fps-result.ldpp-search-hidden {
    display: none !important;
}

.fps-result.ldpp-search-revealed {
    border-radius: 6px;
    background-color: color-mix(in srgb, var(--ldpp-danger) 10%, transparent);
}

/* Count button (top 140): 「⊘ N」 pill by default, or a round button with a notification-style badge. */
.ldpp-search-count-float {
    position: fixed;
    top: 140px;
    right: 16px;
    z-index: 900;
}

.ldpp-search-count.is-badge-style {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    margin: 0;
    padding: 0;
    border: var(--d-button-default-border, 1px solid var(--primary-low, #e9e9e9));
    border-radius: 999px;
    background: var(--secondary, #fff);
    color: var(--primary, #222);
    box-shadow: 0 2px 6px rgb(0 0 0 / 25%);
    cursor: pointer;
}

.ldpp-search-count.is-badge-style > .ldpp-icon {
    width: 22px;
    height: 22px;
}

.ldpp-search-count.is-badge-style > .ldpp-search-count-value {
    position: absolute;
    top: -6px;
    right: -8px;
    min-width: 0.5em;
    padding: 0.21em 0.42em;
    border-radius: 10px;
    background: var(--tertiary-med-or-tertiary, var(--tertiary, #08c));
    color: var(--secondary, #fff);
    font-size: var(--font-down-2, 0.75em);
    font-weight: normal;
    line-height: 1;
}

@media (hover: hover) {
    .ldpp-search-count.is-badge-style:hover {
        background: var(--ldpp-flat-bg-hover);
    }
}

.ldpp-search-count.is-badge-style:active {
    background-image: var(--ldpp-press);
}

.ldpp-search-count.is-badge-style:focus-visible {
    outline: 2px solid var(--ldpp-accent);
    outline-offset: 2px;
}

.ldpp-search-count.is-badge-style.is-revealing {
    box-shadow: none;
}

.ldpp-search-count.is-badge-style.is-revealing > .ldpp-icon {
    opacity: 0.5;
}

.ldpp-search-count.is-badge-style.is-revealing > .ldpp-search-count-value {
    background: var(--primary-medium, #888);
}

/* Filter button (top 193): the old script's transparent red ⊘ that opens the rule panel. */
.ldpp-search-float {
    position: fixed;
    top: 193px;
    right: 16px;
    z-index: 900;
    width: 42px;
    height: 42px;
}

.ldpp-search-fab {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    margin: 0;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--danger, #d32f2f);
    cursor: pointer;
    transition: transform 0.2s ease, opacity 0.2s ease, background-color 0.15s ease;
}

.ldpp-search-fab > .ldpp-icon {
    width: 28px;
    height: 28px;
}

@media (hover: hover) {
    .ldpp-search-fab:hover {
        background: var(--ldpp-flat-bg-hover);
    }
}

.ldpp-search-fab:active {
    background-image: var(--ldpp-press);
}

.ldpp-search-fab:focus-visible {
    outline: 2px solid var(--ldpp-accent);
    outline-offset: 2px;
}

.ldpp-search-float.is-open .ldpp-search-fab {
    opacity: 0;
    pointer-events: none;
    transform: scale(0.9);
}

.ldpp-search-panel {
    position: absolute;
    top: 0;
    right: 0;
    /* Three growing fields could exceed the window; the panel scrolls instead (top 193 px + 16 px margin). */
    max-height: calc(100vh - 209px);
    overflow-y: auto;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: max-content;
    max-width: calc(100vw - 32px);
    padding: 8px 10px 10px;
    border: 1px solid var(--primary-low, rgb(0 0 0 / 12%));
    border-radius: 10px;
    background: var(--secondary, #fff);
    color: var(--primary, #1f1f1f);
    box-shadow: 0 4px 16px rgb(0 0 0 / 18%);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateX(8px) scale(0.98);
    transform-origin: top right;
    transition: opacity 0.2s ease, transform 0.2s ease, visibility 0s 0.2s;
}

.ldpp-search-float.is-open .ldpp-search-panel {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.ldpp-search-head {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 28px;
    margin-bottom: 2px;
    font-size: 13px;
}

.ldpp-search-term {
    overflow: hidden;
    max-width: 150px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ldpp-search-spacer {
    flex: 1;
}

.ldpp-search-row {
    display: flex;
    align-items: flex-start;
    gap: 2px;
    margin: 0;
    font-weight: 400;
}

.ldpp-search-label {
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 500;
    line-height: 28px;
}

.ldpp-search-row textarea.ldpp-search-field {
    box-sizing: border-box;
    width: min(20rem, calc(100vw - 9rem));
    min-height: 28px;
    max-height: 30vh;
    height: 28px;
    padding: 5px 8px;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.3;
    resize: none;
    white-space: pre-wrap;
    word-break: break-all;
}

@media (max-width: 768px) {
    .ldpp-search-panel {
        max-height: calc(100vh - 186px);
    }

    .ldpp-search-count-float {
        top: 120px;
        right: 12px;
    }

    .ldpp-search-float {
        top: 170px;
        right: 12px;
    }
}

/*
 * Same as the old blocker's hover button: a 24 px disc whose ban icon fills it, on a translucent
 * page-coloured background with a drop shadow. The old outer 1 px ring is left off (it read as a double ring).
 */
.ldpp-search-hover {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 950;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: color-mix(in srgb, var(--secondary, #fff) 90%, transparent);
    color: var(--primary, #222);
    box-shadow: 0 2px 8px rgb(0 0 0 / 35%);
    opacity: 0;
    transform: scale(0.92);
    pointer-events: none;
    cursor: pointer;
    transition: opacity 0.15s ease, transform 0.15s ease, color 0.15s ease;
}

.ldpp-search-hover > .ldpp-icon {
    width: 100%;
    height: 100%;
}

.ldpp-search-hover.is-visible,
.ldpp-search-hover:focus-visible {
    opacity: 1;
    transform: none;
    pointer-events: auto;
}

@media (hover: hover) {
    .ldpp-search-hover:hover {
        color: var(--danger, #d32f2f);
    }
}

.ldpp-search-hover:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--danger, #d32f2f) 45%, transparent);
    outline-offset: 2px;
}

.ldpp-search-hover.is-blocked {
    color: var(--danger, #d32f2f);
}

/* 「搜索词规则」 in the plugin's settings dialog. */
.ldpp-search-rules {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.ldpp-search-rules-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
}

.ldpp-search-rules-head .ldpp-search-rules-term {
    flex: 1 1 14rem;
    width: auto;
    min-width: 0;
}
`);

  // src/plugins/topicBlocker/dialogs.ts
  function checkbox(label, checked, onChange) {
    const input = h("input", { type: "checkbox", checked });
    input.addEventListener("change", () => onChange(input.checked));
    return h("label", { class: "ldpp-check" }, input, h("span", null, label));
  }
  function openBlockPicker({ dialogTitle, title, category, tags: tagList, keywordTarget, titleNote, info, apply }) {
    const keywords = [];
    const categories = new Set;
    const tags = new Set;
    const titleBox = autoGrow(h("textarea", { class: "ldpp-input ldpp-title-source", readOnly: true, rows: 2, value: title }));
    const chips = h("div", { class: "ldpp-chips" });
    const preview = h("p", { class: "ldpp-block-preview" });
    const addSelection = Button("添加选中文字", { icon: PlusIcon(), small: true, disabled: true });
    const renderChips = () => {
      chips.replaceChildren(...keywords.map((keyword) => h("span", { class: "ldpp-chip" }, keyword, h("button", {
        type: "button",
        class: "ldpp-chip-remove",
        title: "移除",
        on: { click: () => {
          keywords.splice(keywords.indexOf(keyword), 1);
          renderChips();
        } }
      }, CloseIcon(12)))));
      const parts = [
        keywords.length ? `${keywordTarget}：${keywords.join("、")}` : "",
        categories.size ? `类别：${Array.from(categories).join("、")}` : "",
        tags.size ? `标签：${Array.from(tags).join("、")}` : ""
      ].filter(Boolean);
      preview.textContent = parts.length ? `将添加 → ${parts.join("；")}` : `未选择任何项时，将把整个标题「${title}」加入${keywordTarget}。`;
    };
    const selectionText = () => normalizeText(titleBox.value.slice(titleBox.selectionStart ?? 0, titleBox.selectionEnd ?? 0));
    const syncSelection = () => {
      addSelection.disabled = !selectionText();
    };
    for (const type of ["select", "keyup", "mouseup"])
      titleBox.addEventListener(type, syncSelection);
    addSelection.addEventListener("click", () => {
      const text = selectionText();
      if (text && !keywords.some((keyword) => keyword.toLowerCase() === text.toLowerCase()))
        keywords.push(text);
      titleBox.setSelectionRange(0, 0);
      syncSelection();
      renderChips();
    });
    const toggle = (set, value) => (on) => {
      if (on)
        set.add(value);
      else
        set.delete(value);
      renderChips();
    };
    const body = h("div", { class: "ldpp-block-dialog" }, h("div", { class: "ldpp-block-field" }, h("span", { class: "ldpp-field-label" }, "原标题", titleNote ? InfoTip(titleNote) : null), titleBox, h("div", { class: "ldpp-row-actions" }, addSelection, InfoTip("先在上方的原标题里选中一段文字，再点「添加选中文字」把它作为关键词。")), chips), category ? h("div", { class: "ldpp-block-field" }, h("span", { class: "ldpp-field-label" }, "类别"), checkbox(category, false, toggle(categories, category))) : null, tagList.length ? h("div", { class: "ldpp-block-field" }, h("span", { class: "ldpp-field-label" }, "标签"), h("div", { class: "ldpp-check-group" }, tagList.map((tag) => checkbox(tag, false, toggle(tags, tag))))) : null, preview);
    renderChips();
    openDialog({
      title: dialogTitle,
      icon: BanIcon(18),
      danger: true,
      info,
      body,
      size: "medium",
      actions: [
        { label: "取消" },
        {
          label: "屏蔽",
          kind: "danger",
          onClick: () => {
            const picked = keywords.length || categories.size || tags.size;
            apply({ keywords: picked ? [...keywords] : [title], categories: Array.from(categories), tags: Array.from(tags) });
          }
        }
      ]
    });
  }
  function openBlockDialog(row, rules) {
    openBlockPicker({
      dialogTitle: "屏蔽此话题",
      title: row.originalTitle,
      category: row.category,
      tags: row.tags,
      keywordTarget: "标题关键词",
      titleNote: displayedTitle(row) !== row.originalTitle ? "列表当前显示的是 DeArrow 改写后的标题；屏蔽规则始终匹配原标题。" : undefined,
      apply: ({ keywords, categories, tags }) => {
        rules.set(withAdditions(rules.get(), { titleKeywords: keywords, categories, tags }));
        showToast("已添加屏蔽规则", "success");
      }
    });
  }
  function openUnblockDialog(row, reasons, rules) {
    const selected = new Set(reasons);
    const list = h("ul", { class: "ldpp-reason-list" }, reasons.map((reason) => {
      const input = h("input", { type: "checkbox", checked: true });
      input.addEventListener("change", () => {
        if (input.checked)
          selected.add(reason);
        else
          selected.delete(reason);
      });
      return h("li", null, h("label", { class: "ldpp-check" }, input, h("span", { class: "ldpp-reason-kind" }, REASON_LABEL[reason.kind]), h("code", { class: "ldpp-reason-rule" }, reason.rule), reason.note ? h("span", { class: "ldpp-muted" }, `（${reason.note}）`) : null));
    }));
    openDialog({
      title: "屏蔽原因",
      icon: BanIcon(18),
      danger: true,
      info: "勾选要删除的规则。删除后所有命中这些规则的话题都会恢复显示。",
      size: "medium",
      body: h("div", { class: "ldpp-block-dialog" }, h("p", { class: "ldpp-block-title" }, row.originalTitle), list),
      actions: [
        { label: "关闭" },
        {
          label: "删除所选规则",
          kind: "danger",
          onClick: () => {
            if (!selected.size) {
              showToast("请至少勾选一条规则", "info");
              return false;
            }
            rules.set(withoutReasons(rules.get(), Array.from(selected)));
            showToast(`已删除 ${selected.size} 条屏蔽规则`, "success");
          }
        }
      ]
    });
  }

  // ldpp-css:src/plugins/topicBlocker/styles.css
  registerStyle("topicBlocker", `/* Block buttons hover red, like Discourse's own danger actions; blocked ones stay red. */
.ldpp-row-btn.ldpp-block-btn {
    --ldpp-flat-bg-hover: var(--danger-low, color-mix(in srgb, var(--ldpp-danger) 20%, transparent));
    --ldpp-flat-bg-focus: var(--ldpp-flat-bg-hover);
    --ldpp-flat-icon-hover: var(--danger, var(--ldpp-danger));
}

.ldpp-block-btn.is-blocked {
    --ldpp-btn-tone: var(--danger, var(--ldpp-danger));
}

.ldpp-blocked-float {
    position: fixed;
    top: 140px;
    right: 16px;
    z-index: 900;
}

@media (max-width: 768px) {
    .ldpp-blocked-float {
        top: 120px;
        right: 12px;
    }
}

.ldpp-block-dialog {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
}

.ldpp-block-field {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
}

.ldpp-title-source {
    font-size: 1em;
    line-height: 1.5;
}

.ldpp-block-preview {
    margin: 0;
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
    line-height: 1.5;
}

.ldpp-block-title {
    margin: 0;
    font-weight: 600;
    line-height: 1.5;
}

.ldpp-reason-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

.ldpp-reason-kind {
    flex: none;
    min-width: 5em;
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
}

.ldpp-reason-rule {
    word-break: break-all;
}

.ldpp-rule-hint {
    margin: 0 0 0.5rem;
    font-size: var(--ldpp-font-sm);
}

/* Keyword list: content-width chips that wrap; letter markers sit inside the flow (no full-width rows). */
.ldpp-keywords {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

/* Search / add / A–Z stay reachable while the list scrolls (the dialog body is the only scroller). */
.ldpp-keywords-head {
    position: sticky;
    top: -1rem;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-top: -0.25rem;
    padding: 0.25rem 0 0.4rem;
    background: var(--ldpp-bg);
    box-shadow: 0 1px 0 var(--ldpp-line);
}

.ldpp-keywords-toolbar,
.ldpp-keywords-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
}

.ldpp-keywords-toolbar .ldpp-keywords-search {
    flex: 1 1 12rem;
    width: auto;
    min-width: 0;
}

.ldpp-keywords-toolbar .ldpp-keywords-add {
    flex: 1 1 14rem;
    width: auto;
    min-width: 0;
}

/* 「添加」 and 「批量编辑」 end the two rows at one width, so the sort box ends where the add box above it does (the
   wider 「批量编辑」 pushed it 5.5px left of it). */
.ldpp-keywords-head :is(.ldpp-keywords-toolbar, .ldpp-keywords-meta) > .ldpp-btn:last-child {
    justify-content: center;
    min-width: 6rem;
}

.ldpp-keywords-status {
    font-size: var(--ldpp-font-sm);
    font-variant-numeric: tabular-nums;
}

.ldpp-keywords-index {
    display: flex;
    flex-wrap: wrap;
    gap: 0.125rem;
}

.ldpp-keywords-index[hidden] {
    display: none;
}

.ldpp-keywords-jump {
    min-width: 1.5rem;
    height: 1.5rem;
    margin: 0;
    padding: 0 0.25rem;
    border: 0;
    border-radius: var(--ldpp-btn-radius);
    background: transparent;
    color: var(--ldpp-muted);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
}

@media (hover: hover) {
    .ldpp-keywords-jump:hover {
        background: var(--ldpp-flat-bg-hover);
        color: var(--ldpp-fg);
    }
}

.ldpp-keywords-grid {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem 0.3rem;
}

.ldpp-keywords-letter {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.4rem;
    height: 1.6rem;
    margin-inline-start: 0.35rem;
    color: var(--tertiary, var(--ldpp-accent));
    font-size: 0.75rem;
    font-weight: 700;
    scroll-margin-top: 8.5rem;
}

.ldpp-keywords-letter:first-child {
    margin-inline-start: 0;
}

.ldpp-keyword {
    display: inline-flex;
    align-items: center;
    gap: 0.1rem;
    max-width: 14rem;
    height: 1.6rem;
    padding: 0 0.1rem 0 0.45rem;
    border-radius: var(--ldpp-btn-radius);
    background: var(--primary-very-low, var(--ldpp-soft));
}

.ldpp-keyword-text {
    overflow: hidden;
    min-width: 0;
    font-size: var(--ldpp-font-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ldpp-keywords-hit {
    padding: 0;
    border-radius: 2px;
    background: var(--highlight-low, color-mix(in srgb, var(--ldpp-accent) 30%, transparent));
    color: inherit;
}

.ldpp-icon-btn.ldpp-keyword-remove {
    flex: none;
    width: 1.15rem;
    min-width: 0;
    height: 1.15rem;
    padding: 0;
    color: var(--primary-medium, var(--ldpp-muted));
}

@media (hover: hover) {
    .ldpp-icon-btn.ldpp-keyword-remove:hover {
        background: var(--danger-low, color-mix(in srgb, var(--ldpp-danger) 20%, transparent));
        color: var(--danger, var(--ldpp-danger));
    }
}

.ldpp-keywords-empty {
    flex-basis: 100%;
    margin: 0.5rem 0;
}

.ldpp-keywords-bulk {
    min-height: 8rem;
    resize: vertical;
    line-height: 1.7;
}

.ldpp-keywords-meta .ldpp-keywords-sort {
    width: auto;
    min-height: 1.8rem;
    padding-block: 0.15rem;
    font-size: var(--ldpp-font-sm);
}

.ldpp-regex-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.ldpp-regex-row {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr) auto;
    align-items: start;
    gap: 0.4rem;
}

.ldpp-regex-list.no-notes .ldpp-regex-row {
    grid-template-columns: minmax(0, 1fr) auto;
}

.ldpp-regex-row textarea.ldpp-regex-pattern {
    min-height: 2.1rem;
    resize: none;
    line-height: 1.45;
    white-space: pre-wrap;
    word-break: break-all;
}

.ldpp-regex-error {
    grid-column: 1 / -1;
    color: var(--ldpp-danger);
    font-size: var(--ldpp-font-sm);
}

.ldpp-regex-error:empty {
    display: none;
}
`);

  // src/utils/pinyin.ts
  var collator = new Intl.Collator("zh-Hans-CN-u-co-pinyin", { sensitivity: "base", numeric: true });
  var BOUNDARIES = [
    ["A", "吖"],
    ["B", "八"],
    ["C", "嚓"],
    ["D", "咑"],
    ["E", "妸"],
    ["F", "发"],
    ["G", "旮"],
    ["H", "哈"],
    ["J", "丌"],
    ["K", "咔"],
    ["L", "垃"],
    ["M", "妈"],
    ["N", "拏"],
    ["O", "噢"],
    ["P", "妑"],
    ["Q", "七"],
    ["R", "呥"],
    ["S", "仨"],
    ["T", "他"],
    ["W", "屲"],
    ["X", "夕"],
    ["Y", "丫"],
    ["Z", "帀"]
  ];
  var HAN = /\p{Script=Han}/u;
  function pinyinInitial(text) {
    const first = Array.from(text.trim())[0] ?? "";
    if (/^[a-z]$/i.test(first))
      return first.toUpperCase();
    if (!HAN.test(first))
      return "#";
    let letter = "#";
    for (const [initial, boundary] of BOUNDARIES) {
      if (collator.compare(first, boundary) < 0)
        break;
      letter = initial;
    }
    return letter;
  }
  var groupRank = (letter) => letter === "#" ? 0 : letter.charCodeAt(0);
  function sortByPinyin(values) {
    const keyed = values.map((value) => ({ value, initial: pinyinInitial(value) }));
    keyed.sort((a, b) => groupRank(a.initial) - groupRank(b.initial) || collator.compare(a.value, b.value));
    return keyed.map((item) => item.value);
  }

  // src/plugins/topicBlocker/editor.ts
  var SORT_CHOICES = [{ label: "按拼音", value: "pinyin" }, { label: "按添加顺序", value: "added" }];
  var GROUPS = [
    { id: "title", label: "标题", noun: "关键词", list: "titleKeywords", regex: "titleRegex", listHint: "标题包含任一关键词即屏蔽（忽略大小写）。" },
    { id: "category", label: "类别", noun: "类别", list: "categories", regex: "categoryRegex", listHint: "类别名称完全相同即屏蔽（忽略大小写）。" },
    { id: "tag", label: "标签", noun: "标签", list: "tags", regex: "tagRegex", listHint: "任一标签完全相同即屏蔽（忽略大小写）。" }
  ];
  function renderRegexList(rules, onSave, { notes = true, placeholder = "正则表达式，例如 ^\\[求助\\] 或 /docker/i" } = {}) {
    const draft = rules.map((rule) => ({ ...rule }));
    const root = h("div", { class: classes("ldpp-regex-list", !notes && "no-notes") });
    const commit = () => {
      const clean = draft.filter((rule) => rule.pattern.trim()).map((rule) => ({ pattern: rule.pattern.trim(), note: rule.note.trim() }));
      if (clean.some((rule) => regexError(rule.pattern)))
        return;
      onSave(clean);
    };
    const render = () => {
      root.replaceChildren(...draft.map((rule, index) => {
        const error = h("span", { class: "ldpp-regex-error" });
        const pattern = TextInput({ value: rule.pattern, monospace: true, multiline: true, rows: 1, placeholder });
        pattern.classList.add("ldpp-regex-pattern");
        pattern.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" || event.isComposing)
            return;
          event.preventDefault();
          pattern.blur();
        });
        const validate = () => {
          const message = rule.pattern.trim() ? regexError(rule.pattern) : null;
          pattern.classList.toggle("is-invalid", Boolean(message));
          error.textContent = message ? `无效：${message}` : "";
        };
        pattern.addEventListener("input", () => {
          if (pattern.value.includes(`
`))
            pattern.value = pattern.value.replace(/\n/g, "");
          rule.pattern = pattern.value;
          validate();
        });
        pattern.addEventListener("change", commit);
        const note = notes ? TextInput({ value: rule.note, placeholder: "备注（可选）", onInput: (value) => {
          rule.note = value;
        }, onChange: commit }) : null;
        validate();
        return h("div", { class: "ldpp-regex-row" }, pattern, note, IconButton(TrashIcon(), { title: "删除", onClick: () => {
          draft.splice(index, 1);
          commit();
          render();
        } }), error);
      }), Button("新增正则", { icon: PlusIcon(), small: true, onClick: () => {
        draft.push({ pattern: "", note: "" });
        render();
        root.querySelector(".ldpp-regex-row:last-of-type input")?.focus();
      } }));
    };
    render();
    return root;
  }
  function renderKeywordList(initial, save, { noun = "关键词", sort } = {}) {
    let values = dedupe([...initial]);
    let query = "";
    let bulk = false;
    let order = sort?.get() ?? "pinyin";
    const root = h("div", { class: "ldpp-keywords" });
    const commit = (next) => {
      values = dedupe(next);
      save(values);
      render();
    };
    const search = h("input", { type: "search", class: "ldpp-input ldpp-keywords-search" });
    search.addEventListener("input", () => {
      query = search.value.trim();
      renderGrid();
    });
    const addBox = h("input", { type: "text", class: "ldpp-input ldpp-keywords-add", placeholder: `添加${noun}，多个用逗号分隔` });
    const add = () => {
      const fresh = splitList(addBox.value);
      if (!fresh.length)
        return;
      const known = new Set(values.map(fold));
      const added = fresh.filter((item) => !known.has(fold(item)));
      addBox.value = "";
      if (!added.length) {
        showToast(`${fresh.length > 1 ? "这些" : "这个"}${noun}已经存在`, "info");
        return;
      }
      commit([...values, ...added]);
      addBox.focus();
    };
    addBox.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.isComposing)
        return;
      event.preventDefault();
      add();
    });
    const status = h("span", { class: "ldpp-muted ldpp-keywords-status" });
    const sortSelect = Select(order, SORT_CHOICES, (value) => {
      order = value === "added" ? "added" : "pinyin";
      sort?.set(order);
      renderGrid();
    });
    sortSelect.classList.add("ldpp-keywords-sort");
    sortSelect.title = "排序";
    const grid = h("div", { class: "ldpp-keywords-grid" });
    const index = h("nav", { class: "ldpp-keywords-index", attrs: { "aria-label": "按首字母跳转" } });
    const jump = (letter) => grid.querySelector(`.ldpp-keywords-letter[data-letter="${CSS.escape(letter)}"]`)?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    const highlight = (text) => {
      if (!query)
        return text;
      const at = text.toLowerCase().indexOf(query.toLowerCase());
      if (at < 0)
        return text;
      return [text.slice(0, at), h("mark", { class: "ldpp-keywords-hit" }, text.slice(at, at + query.length)), text.slice(at + query.length)];
    };
    const cell = (value) => h("div", { class: "ldpp-keyword", title: value }, h("span", { class: "ldpp-keyword-text" }, highlight(value)), IconButton(CloseIcon(12), { title: `删除「${value}」`, className: "ldpp-keyword-remove", onClick: () => commit(values.filter((item) => item !== value)) }));
    const renderGrid = () => {
      const needle = query.toLowerCase();
      const matched = needle ? values.filter((value) => value.toLowerCase().includes(needle)) : values;
      status.textContent = needle ? `匹配 ${matched.length} / ${values.length} 个` : `共 ${values.length} 个`;
      if (order === "pinyin") {
        const cells = [];
        const letters = [];
        for (const value of sortByPinyin(matched)) {
          const letter = pinyinInitial(value);
          if (letter !== letters.at(-1)) {
            letters.push(letter);
            cells.push(h("span", { class: "ldpp-keywords-letter", dataset: { letter } }, letter));
          }
          cells.push(cell(value));
        }
        grid.replaceChildren(...cells);
        index.replaceChildren(...letters.map((letter) => h("button", { type: "button", class: "ldpp-keywords-jump", title: `跳到 ${letter}`, on: { click: () => jump(letter) } }, letter)));
        index.hidden = letters.length < 2;
      } else {
        grid.replaceChildren(...matched.map(cell));
        index.replaceChildren();
        index.hidden = true;
      }
      const shown = matched;
      if (!shown.length)
        grid.append(h("p", { class: "ldpp-muted ldpp-keywords-empty" }, needle ? `没有包含「${query}」的${noun}。` : `还没有${noun}。`));
    };
    const render = () => {
      search.placeholder = `在 ${values.length} 个${noun}中搜索`;
      if (bulk) {
        const area = autoGrow(h("textarea", { class: "ldpp-input ldpp-keywords-bulk", value: values.join(", "), spellcheck: false, rows: 4 }), () => Math.round(window.innerHeight * 0.6));
        root.replaceChildren(h("div", { class: "ldpp-keywords-toolbar" }, h("span", { class: "ldpp-muted ldpp-keywords-status" }, `批量编辑：逗号或换行分隔，共 ${values.length} 个`), h("span", { class: "ldpp-search-spacer" }), Button("取消", { small: true, onClick: () => {
          bulk = false;
          render();
        } }), Button("保存", { small: true, kind: "primary", onClick: () => {
          bulk = false;
          commit(splitList(area.value));
        } })), area);
        return;
      }
      root.replaceChildren(h("div", { class: "ldpp-keywords-head" }, h("div", { class: "ldpp-keywords-toolbar" }, search, addBox, Button("添加", { icon: PlusIcon(), onClick: add })), h("div", { class: "ldpp-keywords-meta" }, status, h("span", { class: "ldpp-search-spacer" }), sortSelect, Button("批量编辑", { small: true, onClick: () => {
        bulk = true;
        render();
      } })), index), grid);
      renderGrid();
    };
    render();
    return root;
  }
  function renderRulesEditor(access, sort) {
    const count = h("span");
    const summary = h("p", { class: "ldpp-muted ldpp-rules-summary" }, count, InfoTip("在话题列表中悬停某个话题，点击行尾的 ⦸ 按钮可以从标题中划词添加规则。"));
    const refreshSummary = () => {
      count.textContent = `当前共 ${countRules(access.get())} 条屏蔽规则。`;
    };
    let refreshSubTabs = null;
    const update = (patch) => {
      access.set({ ...access.get(), ...patch });
      refreshSummary();
      refreshSubTabs?.();
    };
    const tabs = Tabs(GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      render: () => {
        const sub = SubTabs([
          {
            label: () => `关键词（${access.get()[group.list].length}）`,
            render: () => h("div", null, h("p", { class: "ldpp-muted ldpp-rule-hint" }, group.listHint.replace("每行一个，也可用逗号分隔。", "").trim()), renderKeywordList(access.get()[group.list], (next) => update({ [group.list]: next }), { noun: group.noun, sort }))
          },
          {
            label: () => `正则（${access.get()[group.regex].length}）`,
            render: () => StackField(`${group.label}正则`, renderRegexList(access.get()[group.regex], (next) => update({ [group.regex]: next })), "支持 /模式/标志 写法（如 /docker/i）；不带斜杠时区分大小写。")
          }
        ]);
        refreshSubTabs = sub.refresh;
        return h("div", { class: "ldpp-rule-group" }, sub.el);
      }
    })));
    refreshSummary();
    return h("div", { class: "ldpp-rules-editor" }, tabs.list, tabs.panel, summary);
  }

  // src/plugins/topicBlocker/index.ts
  var FILTER_ID = "TopicBlocker";
  var SUGGESTED = ".suggested-topics, #suggested-topics, .more-topics__container, .more-topics__lists";
  var keywordSortPreference = {
    get: () => settings5.store.keywordSort === "added" ? "added" : "pinyin",
    set: (value) => {
      settings5.store.keywordSort = value;
    }
  };
  var settings5 = definePluginSettings({
    rules: {
      type: 6 /* CUSTOM */,
      default: EMPTY_RULES
    },
    editor: {
      type: 5 /* COMPONENT */,
      description: "屏蔽规则",
      render: () => renderRulesEditor(rulesAccess, keywordSortPreference)
    },
    keywordSort: {
      type: 6 /* CUSTOM */,
      default: "pinyin"
    },
    showToggle: {
      type: 2 /* BOOLEAN */,
      description: "在页面右侧显示悬浮的「已屏蔽 N」按钮，可随时临时显示被屏蔽的话题。",
      default: true
    },
    showRowButton: {
      type: 2 /* BOOLEAN */,
      description: "悬停话题时在行尾显示屏蔽按钮。",
      default: true
    },
    includeSuggested: {
      type: 2 /* BOOLEAN */,
      description: "同时屏蔽话题页底部「推荐话题」中的条目。",
      default: true
    }
  });
  var rulesAccess = {
    get: () => normalizeRules(settings5.store.rules),
    set: (next) => {
      settings5.store.rules = normalizeRules(next);
    }
  };
  var compiled = null;
  function rules() {
    compiled ??= compileRules(rulesAccess.get());
    return compiled;
  }
  function reasonsFor(row) {
    return row.verdicts.get(FILTER_ID) ?? [];
  }
  function renderButton(row, slot) {
    if (!settings5.store.showRowButton) {
      slot.replaceChildren();
      return;
    }
    const blocked = row.hidden && reasonsFor(row).length > 0;
    const existing = slot.firstElementChild;
    if (existing?.dataset.blocked === String(blocked))
      return;
    const button = IconButton(BanIcon(15), {
      title: blocked ? "查看屏蔽原因" : "屏蔽此话题",
      className: blocked ? "ldpp-row-btn ldpp-block-btn is-blocked" : "ldpp-row-btn ldpp-block-btn ldpp-hover-only",
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        const reasons = reasonsFor(row);
        if (reasons.length)
          openUnblockDialog(row, reasons, rulesAccess);
        else
          openBlockDialog(row, rulesAccess);
      }
    });
    button.dataset.blocked = String(blocked);
    slot.replaceChildren(button);
  }
  function renderToggle(rows) {
    const existing = document.querySelector(".ldpp-blocked-float");
    const count = rows.filter((row) => reasonsFor(row).length > 0).length;
    const revealing = isRevealHidden();
    if (!settings5.store.showToggle || currentRoute().kind === "topic" || !count && !revealing) {
      existing?.remove();
      return;
    }
    const wrapper = existing ?? mark(h("div", { class: "ldpp-blocked-float" }, h("button", {
      type: "button",
      class: "ldpp-float-pill ldpp-blocked-toggle",
      on: { click: () => {
        setRevealHidden(!isRevealHidden());
        schedule();
      } }
    }, BanIcon(18), h("span", { class: "ldpp-float-count ldpp-blocked-count" }))), "blocked-toggle");
    if (!wrapper.isConnected)
      document.body.appendChild(wrapper);
    const button = wrapper.querySelector(".ldpp-blocked-toggle");
    const counter = wrapper.querySelector(".ldpp-blocked-count");
    if (!button || !counter)
      return;
    setClass(button, "is-revealing", revealing);
    const tip = revealing ? `恢复隐藏被屏蔽的 ${count} 个话题` : `临时显示被屏蔽的 ${count} 个话题`;
    if (button.title !== tip)
      button.title = tip;
    if (button.getAttribute("aria-pressed") !== String(revealing))
      button.setAttribute("aria-pressed", String(revealing));
    if (counter.textContent !== String(count))
      counter.textContent = String(count);
  }
  var topicBlocker_default = definePlugin({
    name: "TopicBlocker",
    displayName: "话题屏蔽",
    description: "按标题关键词、类别、标签（支持正则）隐藏列表中的话题；可从话题行直接划词添加规则、查看原因并取消屏蔽。",
    tags: ["topics"],
    icon: BanIcon,
    enabledByDefault: true,
    settings: settings5,
    start() {
      compiled = null;
      registerFilter({
        id: FILTER_ID,
        test: (row) => {
          if (!settings5.store.includeSuggested && row.el.closest(SUGGESTED))
            return null;
          const reasons = evaluate(rules(), { title: row.originalTitle, category: row.category, tags: row.tags });
          return reasons.length ? reasons : null;
        }
      });
      registerDecorator({ id: "block", order: 10, render: renderButton });
      registerProcessor({ id: "blocked-toggle", run: renderToggle });
    },
    stop() {
      unregisterFilter(FILTER_ID);
      unregisterDecorator("block");
      unregisterProcessor("blocked-toggle");
      document.querySelector(".ldpp-blocked-float")?.remove();
      setRevealHidden(false);
    },
    onSettingsChange() {
      compiled = null;
      schedule();
    }
  });

  // src/plugins/searchFilter/manager.ts
  var hint = (text) => h("p", { class: "ldpp-muted ldpp-settings-group-desc" }, text);
  var size = (rule) => rule.blacklist.length + rule.whitelist.length + rule.regex.length;
  function renderSearchRulesManager(store, sort) {
    const root = h("div", { class: "ldpp-search-rules" });
    let selected = "";
    const render = () => {
      const all = store.all();
      const terms = sortByPinyin(Object.keys(all));
      if (!terms.length) {
        root.replaceChildren(h("p", { class: "ldpp-muted" }, "还没有搜索词规则。在搜索页右侧点红色 ⊘，即可为当前搜索词添加。"));
        return;
      }
      if (!terms.includes(selected))
        selected = terms[0];
      const rule = all[selected];
      const picker = Select(selected, terms.map((term) => ({ label: `${term}（${size(all[term])}）`, value: term })), (value) => {
        selected = value;
        render();
      });
      picker.classList.add("ldpp-search-rules-term");
      const relabel = () => {
        const option = Array.from(picker.options).find((item) => item.value === selected);
        if (option)
          option.textContent = `${selected}（${size(store.get(selected))}）`;
      };
      const patch = (change) => {
        const next = { ...store.get(selected), ...change };
        store.set(selected, next);
        if (!size(next))
          render();
        else {
          relabel();
          tabs.refresh();
        }
      };
      const tabs = SubTabs([
        { label: () => `屏蔽词（${store.get(selected).blacklist.length}）`, render: () => h("div", null, hint("标题包含任一屏蔽词即隐藏该结果（忽略大小写）。"), renderKeywordList(store.get(selected).blacklist, (blacklist) => patch({ blacklist }), { noun: "屏蔽词", sort })) },
        { label: () => `必含词（${store.get(selected).whitelist.length}）`, render: () => h("div", null, hint("设置后，标题至少包含其中一个才显示。"), renderKeywordList(store.get(selected).whitelist, (whitelist) => patch({ whitelist }), { noun: "必含词", sort })) },
        { label: () => `正则（${store.get(selected).regex.length}）`, render: () => h("div", null, hint("标题匹配任一正则即隐藏。"), renderRegexList(store.get(selected).regex.map((pattern) => ({ pattern, note: "" })), (next) => patch({ regex: next.map((item) => item.pattern) }), { notes: false, placeholder: "正则表达式，默认忽略大小写；也可写 /模式/标志" })) }
      ]);
      root.replaceChildren(h("div", { class: "ldpp-search-rules-head" }, h("span", { class: "ldpp-field-label" }, `搜索词（${terms.length}）`), picker, Button("删除这个搜索词的全部规则", {
        kind: "delete",
        icon: TrashIcon(),
        onClick: async () => {
          if (!await confirmDialog(`删除「${selected}」的 ${size(rule)} 条搜索规则？`, { title: "删除搜索词规则", danger: true, okLabel: "删除" }))
            return;
          store.set(selected, { ...EMPTY_SEARCH_RULE });
          render();
        }
      })), tabs.el);
    };
    render();
    return root;
  }

  // src/plugins/searchFilter/index.ts
  var RESULT = ".fps-result";
  var VERDICT_LABEL = { blacklist: "屏蔽词", regex: "正则", whitelist: "缺少必含词" };
  var settings6 = definePluginSettings({
    rules: {
      type: 6 /* CUSTOM */,
      default: {}
    },
    manager: {
      type: 5 /* COMPONENT */,
      description: "搜索词规则",
      render: () => renderSearchRulesManager(rulesStore, keywordSortPreference)
    },
    applyBlockerRules: {
      type: 2 /* BOOLEAN */,
      description: "搜索结果同时套用「话题屏蔽」的标题 / 类别 / 标签规则。",
      default: false
    },
    matchBlurb: {
      type: 2 /* BOOLEAN */,
      description: "过滤时同时匹配结果摘要（默认只匹配标题）。",
      default: false
    },
    fabStyle: {
      type: 3 /* SELECT */,
      description: "过滤计数按钮样式",
      options: [
        { label: "图标 + 计数", value: "pill", default: true },
        { label: "圆形图标 + 角标", value: "badge" }
      ]
    }
  });
  var reveal = false;
  function currentTerm() {
    const route = currentRoute();
    return route.kind === "search" ? primaryTerm(route.searchQuery) : "";
  }
  var rulesStore = {
    all: () => normalizeSearchRules(settings6.store.rules),
    get: (term) => getRule(term),
    set: (term, rule) => setRule(term, rule)
  };
  function getRule(term) {
    return normalizeSearchRules(settings6.store.rules)[term] ?? { ...EMPTY_SEARCH_RULE };
  }
  function setRule(term, rule) {
    const all = normalizeSearchRules(settings6.store.rules);
    const clean = normalizeSearchRule(rule);
    if (clean.blacklist.length || clean.whitelist.length || clean.regex.length)
      all[term] = clean;
    else
      delete all[term];
    settings6.store.rules = all;
  }
  function resultFacts(result) {
    const title = normalizeText(result.querySelector(".topic-title")?.textContent ?? result.querySelector("a.search-link")?.textContent);
    const blurb = normalizeText(result.querySelector(".blurb")?.textContent);
    const category = normalizeText(result.querySelector(".badge-category__name")?.textContent);
    const tags = Array.from(new Set(Array.from(result.querySelectorAll("[data-tag-name], .discourse-tag"), (tag) => normalizeText(tag.dataset.tagName ?? tag.textContent)).filter(Boolean)));
    return { title, blurb, category, tags };
  }
  var verdicts = new WeakMap;
  function blockResult(term, result) {
    const facts = resultFacts(result);
    openBlockPicker({
      dialogTitle: "屏蔽此搜索结果",
      title: facts.title,
      category: facts.category,
      tags: facts.tags,
      keywordTarget: `「${term}」的屏蔽词`,
      info: `关键词只加入「${term}」的搜索屏蔽词；勾选的类别、标签加入「话题屏蔽」规则（在搜索页生效需开启「搜索结果同时套用话题屏蔽规则」）。`,
      apply: ({ keywords, categories, tags }) => {
        if (keywords.length) {
          const rule = getRule(term);
          const known = new Set(rule.blacklist.map(fold));
          setRule(term, { ...rule, blacklist: [...rule.blacklist, ...keywords.filter((keyword) => !known.has(fold(keyword)))] });
        }
        if (categories.length || tags.length)
          rulesAccess.set(withAdditions(rulesAccess.get(), { categories, tags }));
        showToast("已添加屏蔽规则", "success");
      }
    });
  }
  function withoutSearchVerdicts(rule, removed) {
    const keywords = new Set(removed.filter((item) => item.kind === "blacklist").map((item) => fold(item.value)));
    const patterns = new Set(removed.filter((item) => item.kind === "regex").map((item) => item.value));
    return {
      blacklist: rule.blacklist.filter((keyword) => !keywords.has(fold(keyword))),
      whitelist: removed.some((item) => item.kind === "whitelist") ? [] : rule.whitelist,
      regex: rule.regex.filter((pattern) => !patterns.has(pattern))
    };
  }
  function unblockResult(term, title, verdict) {
    const selected = new Set([...verdict.search, ...verdict.blocker]);
    const item = (key, kind, rule) => {
      const input = h("input", { type: "checkbox", checked: true });
      input.addEventListener("change", () => {
        if (input.checked)
          selected.add(key);
        else
          selected.delete(key);
      });
      return h("li", null, h("label", { class: "ldpp-check" }, input, h("span", { class: "ldpp-reason-kind" }, kind), h("code", { class: "ldpp-reason-rule" }, rule)));
    };
    const list = h("ul", { class: "ldpp-reason-list" }, verdict.search.map((entry) => item(entry, entry.kind === "whitelist" ? "必含词" : `搜索${VERDICT_LABEL[entry.kind]}`, entry.value)), verdict.blocker.map((reason) => item(reason, `话题屏蔽 · ${REASON_LABEL[reason.kind]}`, reason.rule)));
    openDialog({
      title: "过滤原因",
      icon: BanIcon(18),
      danger: true,
      info: `勾选要删除的规则。搜索规则只作用于「${term}」；「必含词」会整组清空。`,
      size: "medium",
      body: h("div", { class: "ldpp-block-dialog" }, h("p", { class: "ldpp-block-title" }, title), list),
      actions: [
        { label: "关闭" },
        {
          label: "删除所选规则",
          kind: "danger",
          onClick: () => {
            if (!selected.size) {
              showToast("请至少勾选一条规则", "info");
              return false;
            }
            const search = verdict.search.filter((entry) => selected.has(entry));
            const blocker = verdict.blocker.filter((reason) => selected.has(reason));
            if (search.length)
              setRule(term, withoutSearchVerdicts(getRule(term), search));
            if (blocker.length)
              rulesAccess.set(withoutReasons(rulesAccess.get(), blocker));
            showToast(`已删除 ${selected.size} 条规则`, "success");
          }
        }
      ]
    });
  }
  var HOVER_SIZE = 24;
  var HOVER_OFFSET_TOP = 8;
  var HOVER_OFFSET_RIGHT = 10;
  var VIEWPORT_GAP = 6;
  var hoverButton = null;
  var hoverItem = null;
  var hoverFrame = 0;
  function placeHoverButton() {
    hoverFrame = 0;
    const button = hoverButton;
    const item = hoverItem;
    if (!button)
      return;
    const rect = item?.isConnected ? item.getBoundingClientRect() : null;
    if (!rect || !rect.width || !rect.height || rect.bottom < 0 || rect.top > window.innerHeight) {
      hideHoverButton();
      return;
    }
    const left = Math.min(Math.max(rect.right - HOVER_OFFSET_RIGHT - HOVER_SIZE, VIEWPORT_GAP), window.innerWidth - HOVER_SIZE - VIEWPORT_GAP);
    const top = Math.min(Math.max(rect.top + HOVER_OFFSET_TOP, VIEWPORT_GAP), window.innerHeight - HOVER_SIZE - VIEWPORT_GAP);
    button.style.left = `${Math.round(left)}px`;
    button.style.top = `${Math.round(top)}px`;
  }
  function queuePlacement() {
    if (hoverItem && !hoverFrame)
      hoverFrame = requestAnimationFrame(placeHoverButton);
  }
  function showHoverButton(item) {
    const button = hoverButton;
    if (!button)
      return;
    hoverItem = item;
    const filtered = item.classList.contains("ldpp-search-revealed");
    setClass(button, "is-blocked", filtered);
    const tip = filtered ? "查看过滤原因" : "屏蔽该结果";
    if (button.title !== tip) {
      button.title = tip;
      button.setAttribute("aria-label", tip);
    }
    placeHoverButton();
    setClass(button, "is-visible", true);
  }
  function hideHoverButton() {
    hoverItem = null;
    if (hoverButton)
      setClass(hoverButton, "is-visible", false);
  }
  function onHoverOver(event) {
    const target = event.target;
    if (!hoverButton || !target?.closest)
      return;
    if (hoverButton.contains(target))
      return;
    const item = target.closest(RESULT);
    if (item) {
      if (item !== hoverItem || !hoverButton.classList.contains("is-visible"))
        showHoverButton(item);
    } else if (hoverItem) {
      hideHoverButton();
    }
  }
  function onHoverOut(event) {
    if (!event.relatedTarget)
      hideHoverButton();
  }
  function onTouch(event) {
    if (event.pointerType !== "touch")
      return;
    const item = event.target?.closest?.(RESULT);
    if (item)
      showHoverButton(item);
  }
  function ensureHoverButton() {
    if (hoverButton?.isConnected)
      return;
    hoverButton = mark(h("button", {
      type: "button",
      class: "ldpp-search-hover",
      on: {
        click: (event) => {
          event.preventDefault();
          event.stopPropagation();
          const item = hoverItem;
          const term = currentTerm();
          if (!item || !term)
            return;
          const verdict = verdicts.get(item);
          const title = resultFacts(item).title;
          if (verdict && item.classList.contains("ldpp-search-revealed"))
            unblockResult(term, title, verdict);
          else
            blockResult(term, item);
        }
      }
    }, BanIcon(24)), "search-hover");
    document.body.appendChild(hoverButton);
    document.addEventListener("mouseover", onHoverOver, true);
    document.addEventListener("mouseout", onHoverOut, true);
    document.addEventListener("pointerdown", onTouch, true);
    window.addEventListener("scroll", queuePlacement, true);
    window.addEventListener("resize", queuePlacement);
  }
  function removeHoverButton() {
    if (hoverFrame)
      cancelAnimationFrame(hoverFrame);
    hoverFrame = 0;
    hoverItem = null;
    hoverButton?.remove();
    hoverButton = null;
    document.removeEventListener("mouseover", onHoverOver, true);
    document.removeEventListener("mouseout", onHoverOut, true);
    document.removeEventListener("pointerdown", onTouch, true);
    window.removeEventListener("scroll", queuePlacement, true);
    window.removeEventListener("resize", queuePlacement);
  }
  var FIELDS = [
    { key: "blacklist", label: "屏蔽", placeholder: "逗号分隔，标题包含任一即隐藏" },
    { key: "whitelist", label: "必含", placeholder: "逗号分隔，标题至少包含其一" },
    { key: "regex", label: "正则", placeholder: "每行一个，默认忽略大小写" }
  ];
  var floatCleanup = null;
  var fieldText = (rule, key) => key === "regex" ? rule.regex.join(`
`) : rule[key].join(", ");
  function fieldOf(wrapper, key) {
    return wrapper.querySelector(`textarea[data-field="${key}"]`);
  }
  var fieldMax = () => Math.max(150, Math.round(window.innerHeight * 0.3));
  function autosize(area) {
    area.dispatchEvent(new Event("input"));
  }
  function readFields(wrapper) {
    const value = (key) => fieldOf(wrapper, key)?.value ?? "";
    return {
      blacklist: splitList(value("blacklist")),
      whitelist: splitList(value("whitelist")),
      regex: value("regex").split(`
`).map((line) => line.trim()).filter(Boolean)
    };
  }
  function saveFields(wrapper) {
    const term = wrapper.dataset.term;
    if (!term)
      return;
    const next = normalizeSearchRule(readFields(wrapper));
    if (JSON.stringify(next) !== JSON.stringify(getRule(term)))
      setRule(term, next);
  }
  function syncFields(wrapper, rule) {
    for (const { key } of FIELDS) {
      const area = fieldOf(wrapper, key);
      if (!area)
        continue;
      const text = fieldText(rule, key);
      if (area.value !== text)
        area.value = text;
      autosize(area);
    }
  }
  function setOpen(wrapper, open) {
    floatCleanup?.();
    floatCleanup = null;
    setClass(wrapper, "is-open", open);
    wrapper.querySelector(".ldpp-search-fab")?.setAttribute("aria-expanded", String(open));
    if (!open)
      return;
    const onPointer = (event) => {
      if (!wrapper.contains(event.target))
        close();
    };
    const onKey = (event) => {
      if (event.key === "Escape")
        close();
    };
    const close = () => {
      saveFields(wrapper);
      setOpen(wrapper, false);
    };
    document.addEventListener("mousedown", onPointer, true);
    document.addEventListener("keydown", onKey, true);
    floatCleanup = () => {
      document.removeEventListener("mousedown", onPointer, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }
  function buildFloat() {
    const wrapper = mark(h("div", { class: "ldpp-search-float" }), "search-float");
    const fab = h("button", {
      type: "button",
      class: "ldpp-search-fab",
      attrs: { "aria-expanded": "false", "aria-label": "搜索过滤" },
      on: { click: () => setOpen(wrapper, !wrapper.classList.contains("is-open")) }
    }, BanIcon(28));
    const rows = FIELDS.map(({ key, label, placeholder }) => {
      const area = autoGrow(h("textarea", { class: "ldpp-input ldpp-search-field", rows: 1, spellcheck: false, placeholder, dataset: { field: key } }), fieldMax);
      area.addEventListener("change", () => saveFields(wrapper));
      area.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey))
          return;
        event.preventDefault();
        saveFields(wrapper);
        area.blur();
      });
      return h("label", { class: "ldpp-search-row" }, h("span", { class: "ldpp-search-label" }, `${label}：`), area);
    });
    const panel = h("div", { class: "ldpp-search-panel", attrs: { role: "dialog", "aria-label": "搜索过滤" } }, h("div", { class: "ldpp-search-head" }, FilterIcon(14), h("strong", { class: "ldpp-search-term" }), h("span", { class: "ldpp-search-spacer" }), IconButton(SlidersIcon(14), { title: "在设置中查看全部搜索词的规则", onClick: () => {
      saveFields(wrapper);
      setOpen(wrapper, false);
      dispatch("openSettings", { tab: "features", plugin: "SearchFilter" });
    } }), IconButton(CloseIcon(14), { title: "收起（Esc）", onClick: () => {
      saveFields(wrapper);
      setOpen(wrapper, false);
    } })), rows);
    append(wrapper, fab, panel);
    return wrapper;
  }
  function renderCounter(term, hiddenCount) {
    let wrapper = document.querySelector(".ldpp-search-count-float");
    if (!wrapper) {
      wrapper = mark(h("div", { class: "ldpp-search-count-float" }, h("button", {
        type: "button",
        class: "ldpp-search-count",
        on: { click: () => {
          reveal = !reveal;
          schedule();
        } }
      }, BanIcon(18), h("span", { class: "ldpp-float-count ldpp-search-count-value" }))), "search-count");
    }
    if (!wrapper.isConnected)
      document.body.appendChild(wrapper);
    const button = wrapper.querySelector(".ldpp-search-count");
    const value = wrapper.querySelector(".ldpp-search-count-value");
    if (!button || !value)
      return;
    const badgeStyle = settings6.store.fabStyle === "badge";
    setClass(button, "ldpp-float-pill", !badgeStyle);
    setClass(button, "is-badge-style", badgeStyle);
    setClass(button, "is-revealing", reveal);
    const tip = reveal ? `恢复隐藏「${term}」中被过滤的 ${hiddenCount} 条结果` : `临时显示「${term}」中被过滤的 ${hiddenCount} 条结果`;
    if (button.title !== tip)
      button.title = tip;
    if (button.getAttribute("aria-pressed") !== String(reveal))
      button.setAttribute("aria-pressed", String(reveal));
    const text = String(hiddenCount);
    if (value.textContent !== text)
      value.textContent = text;
    const hideValue = badgeStyle && !hiddenCount;
    if (value.hidden !== hideValue)
      value.hidden = hideValue;
  }
  function removeFloat() {
    floatCleanup?.();
    floatCleanup = null;
    document.querySelector(".ldpp-search-float")?.remove();
    document.querySelector(".ldpp-search-count-float")?.remove();
  }
  function renderFloat(term, hiddenCount, rule) {
    let wrapper = document.querySelector(".ldpp-search-float");
    if (!wrapper)
      wrapper = buildFloat();
    if (!wrapper.isConnected)
      document.body.appendChild(wrapper);
    if (wrapper.dataset.term !== term) {
      if (wrapper.dataset.term)
        saveFields(wrapper);
      wrapper.dataset.term = term;
      syncFields(wrapper, rule);
    } else if (!wrapper.contains(document.activeElement)) {
      syncFields(wrapper, rule);
    }
    const title = `搜索过滤「${term}」`;
    const termEl = wrapper.querySelector(".ldpp-search-term");
    if (termEl && termEl.textContent !== title) {
      termEl.textContent = title;
      termEl.title = title;
    }
    const fab = wrapper.querySelector(".ldpp-search-fab");
    if (fab && fab.title !== title)
      fab.title = title;
    renderCounter(term, hiddenCount);
  }
  function process() {
    const term = currentTerm();
    if (!term) {
      removeFloat();
      removeHoverButton();
      return;
    }
    const rule = getRule(term);
    const blocker = settings6.store.applyBlockerRules && isPluginEnabled("TopicBlocker") ? compileRules(rulesAccess.get()) : null;
    let hiddenCount = 0;
    for (const result of Array.from(document.querySelectorAll(RESULT))) {
      const facts = resultFacts(result);
      const text = settings6.store.matchBlurb ? `${facts.title} ${facts.blurb}` : facts.title;
      const search = evaluateSearch(rule, text);
      const blocked = blocker ? evaluate(blocker, facts) : [];
      verdicts.set(result, { search, blocker: blocked });
      const hidden = search.length + blocked.length > 0;
      if (hidden)
        hiddenCount++;
      setClass(result, "ldpp-search-hidden", hidden && !reveal);
      setClass(result, "ldpp-search-revealed", hidden && reveal);
      const tip = [
        ...search.map((item) => `${VERDICT_LABEL[item.kind]}：${item.value}`),
        ...blocked.map((reason) => `话题屏蔽 · ${REASON_LABEL[reason.kind]}：${reason.rule}`)
      ].join(`
`);
      if (result.title !== tip)
        result.title = tip;
    }
    ensureHoverButton();
    if (hoverItem && !hoverItem.isConnected)
      hideHoverButton();
    else if (hoverItem)
      showHoverButton(hoverItem);
    renderFloat(term, hiddenCount, rule);
  }
  var searchFilter_default = definePlugin({
    name: "SearchFilter",
    displayName: "搜索过滤",
    description: "在搜索页右侧的悬浮按钮里，按搜索词分别保存「屏蔽 / 必含 / 正则」规则过滤结果，可一键显示被过滤的结果。",
    tags: ["search"],
    icon: FilterIcon,
    enabledByDefault: true,
    settings: settings6,
    start() {
      registerProcessor({ id: "search-filter", run: process });
    },
    stop() {
      unregisterProcessor("search-filter");
      removeFloat();
      removeHoverButton();
      for (const el of Array.from(document.querySelectorAll(".ldpp-search-hidden, .ldpp-search-revealed")))
        el.classList.remove("ldpp-search-hidden", "ldpp-search-revealed");
    },
    onSettingsChange() {
      schedule();
    }
  });

  // src/plugins/topicSummary/prompts.ts
  var METHOD = [
    "你是严谨的中文技术社区内容分析师。下面是 LINUX DO 论坛的一个话题：#1 为发帖人，其余为回复，格式为「#楼层 用户名[ 回复 用户名]：内容」。",
    "请输出结构化总结，包含三部分：",
    "1. 内容概述：两三句话说明话题在讨论什么、发帖人的诉求或观点。",
    "2. 关键要点：按重要性列出讨论中的核心观点、方案、数据、链接与结论，注明提出者的用户名。",
    "3. 结论与共识：一句话概括当前结论；如有分歧或悬而未决的问题，单独指出。",
    "要求：客观中立；忽略与主题无关的闲聊；不得编造原文没有的信息；篇幅随讨论复杂度调整；正文中的 [图片#N] 对应随消息附带的图片。"
  ].join(`
`);
  var MARKDOWN_FORMAT = [
    "输出格式：Markdown。",
    "三部分分别使用「### 内容概述」「### 关键要点」「### 结论与共识」作为标题；关键要点用有序列表；用户名使用 **粗体**，发帖人用户名额外加「（楼主）」。",
    "不要用代码块包裹整个回答，不要输出与总结无关的说明。"
  ].join(`
`);
  var HTML_FORMAT = [
    "输出格式：HTML 片段（不要使用 ``` 包裹，不要输出 <html>/<body>）。",
    "三部分分别使用 <h3>内容概述</h3>、<h3>关键要点</h3>、<h3>结论与共识</h3>，部分之间用 <hr> 分隔；关键要点使用 <ol><li>；用户名使用 <b>，发帖人用户名可用 color 样式突出（不要用红色）。",
    "不要输出与总结无关的说明。"
  ].join(`
`);
  var DEFAULT_PROMPTS = [
    { id: "markdown", name: "结构化总结（Markdown）", system: METHOD, format: MARKDOWN_FORMAT },
    { id: "html", name: "结构化总结（HTML 彩色）", system: METHOD, format: HTML_FORMAT }
  ];
  function normalizePrompts(raw) {
    const list = Array.isArray(raw) ? raw : [];
    const out = [];
    const seen = new Set;
    list.forEach((item, index) => {
      if (!isObject(item))
        return;
      const system = asString(item.system ?? item.summaryMethod);
      const format = asString(item.format ?? item.outputFormat);
      if (!system && !format)
        return;
      let id = asString(item.id) || `prompt-${index + 1}`;
      while (seen.has(id))
        id = `${id}-${index + 1}`;
      seen.add(id);
      out.push({ id, name: asString(item.name) || `提示词 ${index + 1}`, system, format });
    });
    return out.length ? out : structuredClone(DEFAULT_PROMPTS);
  }
  function renderModeOf(prompt, output) {
    const format = prompt.format.toLowerCase();
    if (format.includes("markdown"))
      return "markdown";
    if (format.includes("html"))
      return "html";
    return inferRenderMode(output, "markdown");
  }
  function stripFences(text, prefixes, suffixes) {
    let out = text.trim();
    for (const token of prefixes) {
      if (token)
        out = out.replace(new RegExp(`^\\s*${escapeRegExp(token)}\\s*`, "i"), "");
    }
    for (const token of suffixes) {
      if (token)
        out = out.replace(new RegExp(`\\s*${escapeRegExp(token)}\\s*$`, "i"), "");
    }
    return out.trim();
  }

  // src/plugins/_core/settings/legacy.ts
  var MB = 1024 * 1024;
  var BLOCKER_KEYS = ["blockedTitles", "blockedCategories", "blockedTags", "blockedTtags", "titleRegexList", "categoryRegexList", "tagRegexList", "searchFilterMap"];
  var isBlockerExport = (raw) => BLOCKER_KEYS.some((key) => (key in raw));
  var isSummarySettings = (raw) => Array.isArray(raw.promptConfigurations) || Array.isArray(raw.apiConfigurations);
  var isSummaryContent = (raw) => {
    const values = Object.values(raw);
    return values.length > 0 && values.every((value) => Array.isArray(value) && value.every((item) => isObject(item) && ("summary" in item)));
  };
  var isAllData = (raw) => ("summaryHistory" in raw) || ("topicQuestionHistory" in raw) || ("dearrowTopicStates" in raw);
  function describeLegacy(raw) {
    if (!isObject(raw))
      return "未知";
    if (isAllData(raw))
      return "旧版总结脚本「全部数据」";
    if (isSummarySettings(raw))
      return "旧版总结脚本「脚本配置」";
    if (isBlockerExport(raw))
      return "旧版屏蔽脚本配置";
    if (isSummaryContent(raw))
      return "旧版总结脚本「总结内容」";
    if (parseKeywordExport(raw))
      return "「Keywords Search Enhanced」导出文件";
    return "未知";
  }
  var regex = (a, b) => [...a, ...b.filter((rule) => !a.some((existing) => existing.pattern === rule.pattern))];
  function mergeBlockRules(incoming) {
    const current = rulesAccess.get();
    return {
      titleKeywords: dedupe([...current.titleKeywords, ...incoming.titleKeywords]),
      categories: dedupe([...current.categories, ...incoming.categories]),
      tags: dedupe([...current.tags, ...incoming.tags]),
      titleRegex: regex(current.titleRegex, incoming.titleRegex),
      categoryRegex: regex(current.categoryRegex, incoming.categoryRegex),
      tagRegex: regex(current.tagRegex, incoming.tagRegex)
    };
  }
  function mergeSearchRules(incoming) {
    const current = normalizeSearchRules(settings6.store.rules);
    for (const [term, rule] of Object.entries(incoming)) {
      const existing = current[term];
      current[term] = existing ? {
        blacklist: dedupe([...existing.blacklist, ...rule.blacklist]),
        whitelist: dedupe([...existing.whitelist, ...rule.whitelist]),
        regex: Array.from(new Set([...existing.regex, ...rule.regex]))
      } : rule;
    }
    return current;
  }
  function blockerPatch(raw) {
    const patch = {};
    const rules = normalizeRules({
      titleKeywords: raw.blockedTitles,
      categories: raw.blockedCategories,
      tags: raw.blockedTags ?? raw.blockedTtags,
      titleRegex: normalizeRegexRules(raw.titleRegexList),
      categoryRegex: normalizeRegexRules(raw.categoryRegexList),
      tagRegex: normalizeRegexRules(raw.tagRegexList)
    });
    patch.TopicBlocker = { rules: mergeBlockRules(rules) };
    const search = normalizeSearchRules(raw.searchFilterMap);
    if (Object.keys(search).length)
      patch.SearchFilter = { rules: mergeSearchRules(search) };
    return patch;
  }
  function toastSeconds(raw, fallback) {
    if (!isObject(raw))
      return fallback;
    if (raw.autoClose === false)
      return 0;
    const value = Number(raw.duration);
    return Number.isFinite(value) ? Math.max(0, Math.min(60, value)) : fallback;
  }
  function summarySettingsPatch(raw) {
    const patch = {};
    const apis = Array.isArray(raw.apiConfigurations) ? raw.apiConfigurations : [];
    const imported = apis.filter(isObject).map((api, index) => normalizeProfile({
      id: `legacy-${index + 1}`,
      name: api.name,
      url: api.url,
      key: api.key,
      model: api.model,
      retryCount: api.retryCount ?? raw.autoRetryCount,
      retryInterval: api.retryInterval ?? raw.autoRetryInterval,
      imageInput: api.imageInputEnabled === true,
      imageDetail: api.imageDetail,
      maxImages: api.maxImagesPerRequest,
      maxImageMB: Number(api.maxImageBytes) / MB || undefined,
      maxTotalImageMB: Number(api.maxTotalImageBytes) / MB || undefined
    }));
    const idAt = (index) => imported[Number.parseInt(String(index ?? 0), 10)]?.id ?? imported[0]?.id ?? "";
    if (imported.length) {
      const existing = listProfiles().filter((profile) => profile.key && !imported.some((item) => item.url === profile.url && item.model === profile.model && item.key === profile.key));
      patch.AI = { profiles: [...imported, ...existing], activeProfile: idAt(raw.currentApiIndex) };
    }
    if (Array.isArray(raw.promptConfigurations)) {
      const prompts = normalizePrompts(raw.promptConfigurations).map((prompt, index) => ({ ...prompt, id: `legacy-prompt-${index + 1}` }));
      const index = Number.parseInt(String(raw.currentPromptIndex ?? 0), 10);
      patch.TopicSummary = { prompts, activePrompt: prompts[index]?.id ?? prompts[0]?.id };
    }
    const summary = patch.TopicSummary ?? {};
    if ("newTopicAutoSummarize" in raw)
      summary.autoSummarize = raw.newTopicAutoSummarize === true;
    if ("defaultOpenSidebar" in raw)
      summary.autoOpen = raw.defaultOpenSidebar === true;
    if (raw.sidebarPosition === "left" || raw.sidebarPosition === "right")
      summary.sidebarPosition = raw.sidebarPosition;
    if (isObject(raw.summaryOutputFilters)) {
      summary.stripFences = raw.summaryOutputFilters.enabled !== false;
      summary.fencePrefixes = asStringArray(raw.summaryOutputFilters.leadingTokens).join(`
`);
      summary.fenceSuffixes = asStringArray(raw.summaryOutputFilters.trailingTokens).join(`
`);
    }
    if (Object.keys(summary).length)
      patch.TopicSummary = summary;
    const list = {};
    if ("listPageSummaryEnabled" in raw)
      list.enabled = raw.listPageSummaryEnabled !== false;
    if ("autoShowSummaryInList" in raw)
      list.singleExpand = raw.autoShowSummaryInList !== false;
    if ("listPageSummaryMaxLines" in raw)
      list.maxLines = Math.min(40, Math.max(4, Number(raw.listPageSummaryMaxLines) || 14));
    if (raw.summaryWidthType === "percent" && Number.isFinite(Number(raw.summaryWidthValue)))
      list.widthPercent = Math.min(100, Math.max(40, Math.round(Number(raw.summaryWidthValue))));
    if (Object.keys(list).length)
      patch.ListSummary = list;
    if (Array.isArray(raw.customQuestionPresets)) {
      patch.TopicQA = { presets: raw.customQuestionPresets.filter(isObject).map((preset, index) => ({ id: asString(preset.id) || `legacy-preset-${index + 1}`, name: asString(preset.name), prompt: asString(preset.prompt) })).filter((preset) => preset.prompt) };
    }
    const dearrow = {};
    if ("dearrowEnabled" in raw)
      dearrow.enabled = raw.dearrowEnabled === true;
    if ("dearrowAutoRewrite" in raw)
      dearrow.autoRewrite = raw.dearrowAutoRewrite === true;
    if (asString(raw.dearrowJudgmentPrompt))
      dearrow.judgePrompt = asString(raw.dearrowJudgmentPrompt);
    if (asString(raw.dearrowRewritePrompt))
      dearrow.rewritePrompt = asString(raw.dearrowRewritePrompt);
    if (imported.length) {
      dearrow.judgeProfile = idAt(raw.dearrowJudgmentApiIndex ?? raw.dearrowApiIndex);
      dearrow.rewriteProfile = idAt(raw.dearrowRewriteApiIndex ?? raw.dearrowApiIndex);
    }
    const scope = asStringArray(raw.dearrowScopeRules);
    if (scope.length)
      dearrow.scope = scope.join(`
`);
    if (Object.keys(dearrow).length)
      patch.DeArrow = dearrow;
    const toast = {};
    if ("toastEnabled" in raw)
      toast.enabled = raw.toastEnabled !== false;
    if (isObject(raw.toastSettings)) {
      toast.infoSeconds = toastSeconds(raw.toastSettings.info, 3);
      toast.successSeconds = toastSeconds(raw.toastSettings.success, 0);
      toast.warningSeconds = toastSeconds(raw.toastSettings.warning, 6);
      toast.errorSeconds = toastSeconds(raw.toastSettings.error, 0);
    }
    if ("toastAutoExpand" in raw)
      toast.clickExpands = raw.toastAutoExpand !== false;
    if ("toastClickAutoOpenSidebar" in raw)
      toast.clickOpensSidebar = raw.toastClickAutoOpenSidebar !== false;
    if (Object.keys(toast).length)
      patch.Notifications = toast;
    if (isObject(raw.driveSummarySettings)) {
      const drive = raw.driveSummarySettings;
      patch.DriveSync = { enabled: drive.enabled === true, clientId: asString(drive.clientId), clientSecret: asString(drive.clientSecret), refreshToken: asString(drive.refreshToken) };
    }
    return { patch, summarized: asStringArray(raw.summaryTopicIds) };
  }
  function listMap2(raw, normalize) {
    const out = {};
    if (!isObject(raw))
      return out;
    for (const [id, value] of Object.entries(raw)) {
      const items = normalize(value);
      if (items.length)
        out[id] = items;
    }
    return out;
  }
  function backup(patch, data) {
    return { format: "ldpp-backup", version: 1, exportedAt: new Date().toISOString(), settingsPatch: Object.keys(patch).length ? patch : undefined, data };
  }
  function convertLegacy(raw) {
    if (!isObject(raw))
      return null;
    if (isAllData(raw)) {
      const fromSettings = isObject(raw.settings) ? summarySettingsPatch(raw.settings) : { patch: {}, summarized: [] };
      return backup(fromSettings.patch, {
        summaries: listMap2(raw.summaryHistory, normalizeSummaryList),
        questions: listMap2(raw.topicQuestionHistory, normalizeQAList),
        summarized: fromSettings.summarized,
        dearrow: normalizeDeArrowMap(raw.dearrowTopicStates)
      });
    }
    if (isSummarySettings(raw)) {
      const { patch, summarized } = summarySettingsPatch(raw);
      return backup(patch, { summarized });
    }
    if (isBlockerExport(raw))
      return backup(blockerPatch(raw), {});
    if (isSummaryContent(raw))
      return backup({}, { summaries: listMap2(raw, normalizeSummaryList) });
    const saved = parseKeywordExport(raw);
    if (saved) {
      const patch = {};
      if (saved.keywords)
        patch.keywords = normalizeKeywords([...normalizeKeywords(settings4.store.keywords), ...saved.keywords]);
      if (saved.links)
        patch.links = normalizeLinks([...normalizeLinks(settings4.store.links), ...saved.links]);
      return backup({ KeywordSearch: patch }, {});
    }
    return null;
  }

  // src/plugins/_core/settings/data.ts
  var SECRET_PATHS = [["DriveSync", "clientSecret"], ["DriveSync", "refreshToken"]];
  function stripSecrets(settings) {
    const copy = structuredClone(settings);
    const profiles = copy.plugins.AI?.profiles;
    if (Array.isArray(profiles)) {
      for (const profile of profiles)
        if (isObject(profile))
          profile.key = "";
    }
    for (const [plugin, key] of SECRET_PATHS)
      if (copy.plugins[plugin]?.[key])
        copy.plugins[plugin][key] = "";
    return copy;
  }
  function keepLocalSecrets(next) {
    const local = PlainSettings.plugins;
    const incoming = next.plugins.AI?.profiles;
    const known = Array.isArray(local.AI?.profiles) ? local.AI.profiles : [];
    if (Array.isArray(incoming)) {
      for (const profile of incoming) {
        if (!isObject(profile) || profile.key)
          continue;
        const match = known.find((item) => item.id === profile.id);
        if (match?.key)
          profile.key = match.key;
      }
    }
    for (const [plugin, key] of SECRET_PATHS) {
      const target = next.plugins[plugin];
      if (target && !target[key] && local[plugin]?.[key])
        target[key] = local[plugin][key];
    }
  }
  function createBackup(includeSecrets) {
    for (const store of ALL_STORES)
      store.flush();
    const settings = structuredClone(PlainSettings);
    return {
      format: "ldpp-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: includeSecrets ? settings : stripSecrets(settings),
      data: {
        summaries: structuredClone(Summaries.all()),
        questions: structuredClone(Questions.all()),
        summarized: Object.keys(Summarized.all()),
        dearrow: structuredClone(DeArrowStates.all())
      }
    };
  }
  function syncPluginStates() {
    for (const plugin of Object.values(plugins)) {
      const enabled = isPluginEnabled(plugin.name);
      if (enabled && !plugin.started)
        startPlugin(plugin);
      else if (!enabled && plugin.started)
        stopPlugin(plugin);
    }
  }
  function mergeListMap(local, incoming, normalize, merge) {
    const out = {};
    for (const [id, raw] of Object.entries(incoming ?? {})) {
      const items = normalize(raw);
      if (items.length)
        out[id] = merge(local[id] ?? [], items);
    }
    return out;
  }
  function applyBackup(backup) {
    const notes = [];
    if (backup.settings) {
      const next = structuredClone(backup.settings);
      keepLocalSecrets(next);
      SettingsStore2.replaceAll({ plugins: next.plugins ?? {} });
      notes.push("设置已替换");
    }
    if (backup.settingsPatch) {
      for (const [plugin, patch] of Object.entries(backup.settingsPatch)) {
        SettingsStore2.store.plugins[plugin] = { ...PlainSettings.plugins[plugin], ...patch };
      }
      notes.push(`设置已合并（${Object.keys(backup.settingsPatch).length} 个模块）`);
    }
    syncPluginStates();
    const { data } = backup;
    const summaries = mergeListMap(Summaries.all(), data.summaries, normalizeSummaryList, mergeSummaries);
    if (Object.keys(summaries).length) {
      Summaries.setMany(summaries, "import");
      notes.push(`总结 ${Object.keys(summaries).length} 个话题`);
    }
    const questions = mergeListMap(Questions.all(), data.questions, normalizeQAList, mergeQA);
    if (Object.keys(questions).length) {
      Questions.setMany(questions, "import");
      notes.push(`问答 ${Object.keys(questions).length} 个话题`);
    }
    const flags = Object.fromEntries([...data.summarized ?? [], ...Object.keys(summaries)].map((id) => [String(id), true]));
    if (Object.keys(flags).length) {
      const added = Object.keys(flags).filter((id) => !Summarized.has(id)).length;
      Summarized.setMany(flags, "import");
      if (added)
        notes.push(`「已总结」标记 ${added} 个话题`);
    }
    const dearrow = normalizeDeArrowMap(data.dearrow ?? {});
    if (Object.keys(dearrow).length) {
      const merged = mergeDeArrowMaps(DeArrowStates.all(), dearrow);
      DeArrowStates.setMany(Object.fromEntries(Object.keys(dearrow).map((id) => [id, merged[id]])), "import");
      notes.push(`DeArrow ${Object.keys(dearrow).length} 个话题`);
    }
    return notes;
  }
  function isBackup(raw) {
    return isObject(raw) && raw.format === "ldpp-backup" && isObject(raw.data);
  }
  async function importFile() {
    let raw;
    try {
      raw = await pickJsonFile();
    } catch (error) {
      if (!isAbortError(error))
        showToast(errorMessage(error), "warning");
      return;
    }
    const backup = isBackup(raw) ? raw : convertLegacy(raw);
    if (!backup) {
      showToast("无法识别的文件：既不是 LD++ 备份，也不是旧版屏蔽 / 总结 / 关键词搜索脚本的导出文件", "error");
      return;
    }
    const kind = isBackup(raw) ? "LD++ 备份" : describeLegacy(raw);
    const replacesSettings = Boolean(backup.settings);
    const ok = await confirmDialog(h("div", null, h("p", null, `识别为：${kind}`), h("p", null, replacesSettings ? "导入会用文件中的设置替换当前设置（本地已有的 API Key 会保留），数据部分会与现有数据合并。" : "导入会把文件中的规则 / 配置合并进当前设置，数据部分会与现有数据合并。")), { title: "导入数据", icon: DatabaseIcon(18), okLabel: "导入" });
    if (!ok)
      return;
    try {
      const notes = applyBackup(backup);
      showToast(`导入完成：${notes.join("，") || "没有可导入的内容"}`, "success");
    } catch (error) {
      showToast(`导入失败：${errorMessage(error)}`, "error");
    }
  }
  var sizeOf = (value) => `${(JSON.stringify(value).length / 1024).toFixed(1)} KB`;
  function stats() {
    return h("ul", { class: "ldpp-stats" }, h("li", null, `总结：${Summaries.size} 个话题（${sizeOf(Summaries.all())}）`), h("li", null, `问答：${Questions.size} 个话题（${sizeOf(Questions.all())}）`), h("li", null, `已总结标记：${Summarized.size} 个话题`), h("li", null, `DeArrow 状态：${DeArrowStates.size} 个话题（${sizeOf(DeArrowStates.all())}）`), h("li", null, `设置：${sizeOf(PlainSettings)}`));
  }
  function renderDataPanel() {
    let includeSecrets = false;
    const statBox = h("div", null, stats());
    const clearButton = (label, store) => Button(`清空${label}`, {
      kind: "delete",
      icon: TrashIcon(),
      small: true,
      onClick: async () => {
        if (!await confirmDialog(`确定清空全部${label}吗？此操作不可撤销（已同步到 Drive 的副本不受影响）。`, { title: `清空${label}`, danger: true, okLabel: "清空" }))
          return;
        store.replaceAll({}, "local");
        statBox.replaceChildren(stats());
        showToast(`已清空${label}`, "success");
      }
    });
    return h("div", { class: "ldpp-data-panel" }, Section("导出", Field("包含 API Key 与 Drive 凭据", Switch(false, (value) => {
      includeSecrets = value;
    }), "关闭时导出的文件不含任何密钥，可放心分享。"), h("div", { class: "ldpp-row-actions" }, Button("导出 LD++ 备份", { kind: "primary", onClick: () => {
      downloadJson(createBackup(includeSecrets), `LDPP-备份_${todayStamp()}.json`);
      showToast("备份已导出", "success");
    } }))), Section(["导入", InfoTip("支持：LD++ 备份；旧版「LINUX DO 屏蔽脚本」导出的配置；旧版「话题 & 回复 总结」导出的「脚本配置」「总结内容」「全部数据」。数据按话题合并，不会覆盖已有记录。")], h("div", { class: "ldpp-row-actions" }, Button("选择文件导入…", { onClick: () => importFile().then(() => statBox.replaceChildren(stats())) }))), Section("本地存储", statBox, h("div", { class: "ldpp-row-actions" }, clearButton("总结", Summaries), clearButton("问答", Questions), clearButton("DeArrow 状态", DeArrowStates))));
  }

  // src/plugins/_core/settings/form.ts
  function Slider(def, value, onChange) {
    const output = h("output", { class: "ldpp-slider-value" }, `${value}${def.unit ?? ""}`);
    const input = h("input", { type: "range", class: "ldpp-slider", min: String(def.min), max: String(def.max), step: String(def.step ?? 1), value: String(value) });
    input.addEventListener("input", () => {
      output.textContent = `${input.value}${def.unit ?? ""}`;
    });
    input.addEventListener("change", () => onChange(Number(input.value)));
    return h("span", { class: "ldpp-slider-wrap" }, input, output);
  }
  function control(key, def, store) {
    const value = store[key] ?? resolveDefault(def);
    const set = (next) => {
      store[key] = next;
      def.onChange?.(next);
    };
    switch (def.type) {
      case 2 /* BOOLEAN */:
        return Field(def.description, Switch(Boolean(value), set, def.description));
      case 0 /* STRING */: {
        const input = TextInput({ value: String(value ?? ""), multiline: def.multiline, secret: def.secret, placeholder: def.placeholder, monospace: def.multiline });
        const error = h("p", { class: "ldpp-field-error" });
        const field = input.querySelector("input") ?? input;
        field.addEventListener("change", () => {
          const verdict = def.isValid?.(field.value) ?? true;
          error.textContent = verdict === true ? "" : verdict;
          field.classList.toggle("is-invalid", verdict !== true);
          if (verdict === true)
            set(field.value);
        });
        return def.multiline ? StackField(def.description, [input, error]) : Field(def.description, h("span", { class: "ldpp-field-control ldpp-field-wide" }, input, error));
      }
      case 1 /* NUMBER */:
        return Field(def.description, NumberInput({ value: Number(value ?? 0), min: def.min, max: def.max, unit: def.unit, onChange: set }));
      case 4 /* SLIDER */:
        return Field(def.description, Slider(def, Number(value ?? def.default), set));
      case 3 /* SELECT */: {
        const options = typeof def.options === "function" ? def.options() : def.options;
        return Field(def.description, Select(String(value), options.map((option) => ({ label: option.label, value: String(option.value) })), (raw) => set(options.find((option) => String(option.value) === raw)?.value ?? raw)));
      }
      case 5 /* COMPONENT */:
        return def.render();
      case 6 /* CUSTOM */:
        return null;
    }
  }
  function renderSettingsForm(plugin, only) {
    const defined = plugin.settings;
    if (!defined)
      return null;
    const store = defined.store;
    const entries = Object.entries(defined.def).filter(([key, def]) => !def.hidden && (!only || only(key, def)));
    const fields = [];
    for (let i = 0;i < entries.length; i++) {
      const [key, def] = entries[i];
      if (!def.group) {
        const el = control(key, def, store);
        if (el)
          fields.push(el);
        continue;
      }
      const members = [];
      while (i < entries.length && entries[i][1].group === def.group)
        members.push(entries[i++]);
      i--;
      const tabs = SubTabs(members.map(([memberKey, member]) => ({
        label: () => member.tab ?? member.description ?? "",
        render: () => h("div", { class: "ldpp-settings-group-panel" }, h("p", { class: "ldpp-muted ldpp-settings-group-desc" }, member.description), control(memberKey, { ...member, description: "" }, store))
      })));
      fields.push(h("div", { class: "ldpp-field ldpp-field-stack ldpp-settings-group" }, h("span", { class: "ldpp-field-label" }, def.group), tabs.el));
    }
    return fields.length ? h("div", { class: "ldpp-settings-form" }, fields) : null;
  }

  // src/plugins/_core/settings/index.ts
  var dialog = null;
  var settings7 = definePluginSettings({
    starred: {
      type: 6 /* CUSTOM */,
      default: []
    },
    pinned: {
      type: 6 /* CUSTOM */,
      default: []
    }
  });
  var TAG_LABEL = { topics: "话题列表", reading: "阅读", ai: "AI", search: "搜索", sync: "同步" };
  var FILTERS2 = [
    { value: "all", label: "全部" },
    { value: "enabled", label: "已启用" },
    { value: "disabled", label: "未启用" }
  ];
  var listOf = (key) => Array.isArray(settings7.store[key]) ? settings7.store[key] : [];
  var toggleIn = (key, name) => {
    const list = listOf(key);
    settings7.store[key] = list.includes(name) ? list.filter((item) => item !== name) : [...list, name];
  };
  function visibleSettings(plugin) {
    return Object.entries(plugin.settings?.def ?? {}).filter(([, def]) => !def.hidden && def.type !== 6 /* CUSTOM */);
  }
  function renderPluginSettings(plugin) {
    const entries = visibleSettings(plugin);
    const editors = entries.filter(([, def]) => def.type === 5 /* COMPONENT */);
    const ordinary = entries.filter(([, def]) => def.type !== 5 /* COMPONENT */);
    if (!editors.length || !ordinary.length)
      return renderSettingsForm(plugin) ?? h("p", { class: "ldpp-muted" }, "该功能没有可调整的设置。");
    const tabs = [];
    let generalAdded = false;
    for (const [key, def] of entries) {
      if (def.type === 5 /* COMPONENT */) {
        tabs.push({ label: () => def.description ?? key, render: () => renderSettingsForm(plugin, (other) => other === key) ?? h("div") });
      } else if (!generalAdded) {
        generalAdded = true;
        tabs.push({ label: () => "常规", render: () => renderSettingsForm(plugin, (_, other) => other.type !== 5 /* COMPONENT */) ?? h("div") });
      }
    }
    return SubTabs(tabs).el;
  }
  function openPluginDialog(plugin) {
    const list = h("div", { class: "ldpp-plugin-dialog-settings" });
    const render = () => list.replaceChildren(renderPluginSettings(plugin));
    render();
    const resettable = visibleSettings(plugin).filter(([, def]) => def.type !== 5 /* COMPONENT */).map(([key]) => key);
    openDialog({
      title: plugin.displayName,
      icon: plugin.icon?.(18),
      size: "large",
      back: "返回设置",
      className: "ldpp-plugin-dialog",
      body: [
        h("p", { class: "ldpp-plugin-dialog-desc" }, plugin.description),
        h("h3", { class: "ldpp-plugin-dialog-label" }, "设置"),
        list
      ],
      actions: resettable.length ? [{
        label: "重置",
        onClick: async () => {
          if (!await confirmDialog(`把「${plugin.displayName}」的设置恢复为默认值？此操作不可撤销。`, { title: "重置设置", danger: true, icon: RefreshIcon(18), okLabel: "重置" }))
            return false;
          for (const key of resettable)
            plugin.settings?.reset(key);
          render();
          return false;
        }
      }] : []
    });
  }
  function iconToggle(on, icons, labels, className, onClick) {
    return IconButton(on ? icons[1]() : icons[0](), { title: on ? labels[1] : labels[0], className: classes("ldpp-row-btn", className, on && "is-on"), onClick });
  }
  function pluginCard(plugin, rerender) {
    const starred = listOf("starred").includes(plugin.name);
    const pinned = listOf("pinned").includes(plugin.name);
    const enabled = isPluginEnabled(plugin.name);
    const tags = (plugin.tags ?? []).map((tag) => TAG_LABEL[tag]).filter(Boolean);
    const card = h("article", { class: classes("ldpp-plugin-card", !enabled && "is-off"), dataset: { plugin: plugin.name } }, h("div", { class: "ldpp-plugin-card-body" }, h("div", { class: "ldpp-plugin-card-head" }, h("div", { class: "ldpp-plugin-card-name" }, h("span", { class: "ldpp-plugin-card-icon" }, plugin.icon?.(14) ?? PluginIcon(14)), h("span", { class: "ldpp-plugin-card-title", title: plugin.displayName }, plugin.displayName)), h("div", { class: "ldpp-plugin-card-controls" }, iconToggle(starred, [StarIcon, StarFilledIcon], ["收藏", "取消收藏"], "ldpp-plugin-star", () => {
      toggleIn("starred", plugin.name);
      rerender();
    }), iconToggle(pinned, [PinIcon, PinFilledIcon], ["置顶", "取消置顶"], "ldpp-plugin-pin", () => {
      toggleIn("pinned", plugin.name);
      rerender();
    }), visibleSettings(plugin).length ? IconButton(SlidersIcon(), { title: "设置", className: "ldpp-row-btn ldpp-plugin-config", onClick: () => openPluginDialog(plugin) }) : null, Switch(enabled, (value) => setPluginEnabled(plugin.name, value), plugin.displayName))), h("p", { class: "ldpp-plugin-card-desc", title: plugin.description }, plugin.description)), h("div", { class: "ldpp-plugin-card-footer" }, tags.join(" · ") || " "));
    return card;
  }
  function renderFeatures(focus) {
    const all = Object.values(plugins).filter((plugin) => !plugin.hidden && !plugin.required).toSorted((a, b) => a.displayName.localeCompare(b.displayName, "zh"));
    const tagTabs = Object.keys(TAG_LABEL).filter((tag) => all.some((plugin) => plugin.tags?.includes(tag)));
    const tabs = [{ id: "favorites", label: "收藏" }, { id: "all", label: "全部" }, ...tagTabs.map((tag) => ({ id: tag, label: TAG_LABEL[tag] ?? tag }))];
    let category = focus || !listOf("starred").length ? "all" : "favorites";
    let filter = "all";
    let query = "";
    const tabBar = h("div", { class: "ldpp-plugins-tabs", attrs: { role: "tablist" } });
    const search = h("input", { type: "search", class: "ldpp-input ldpp-plugins-search", placeholder: `搜索 ${all.length} 个功能…` });
    const select = h("select", { class: "ldpp-input ldpp-plugins-filter" }, FILTERS2.map((option) => h("option", { value: option.value }, option.label)));
    const grid = trackScrollbar(h("div", { class: "ldpp-plugins-grid" }));
    const visible = () => {
      const starred = listOf("starred");
      const pinned = listOf("pinned");
      const needle = query.trim().toLowerCase();
      let list = category === "favorites" ? starred.map((name) => all.find((plugin) => plugin.name === name)).filter((plugin) => Boolean(plugin)) : category === "all" ? all : all.filter((plugin) => plugin.tags?.includes(category));
      if (filter !== "all")
        list = list.filter((plugin) => isPluginEnabled(plugin.name) === (filter === "enabled"));
      if (needle)
        list = list.filter((plugin) => `${plugin.displayName} ${plugin.name} ${plugin.description}`.toLowerCase().includes(needle));
      if (category !== "favorites" && pinned.length) {
        const rank = (plugin) => {
          const index = pinned.indexOf(plugin.name);
          return index < 0 ? Infinity : index;
        };
        list = list.toSorted((a, b) => rank(a) - rank(b));
      }
      return list;
    };
    const render = () => {
      tabBar.replaceChildren(...tabs.map((tab) => h("button", {
        type: "button",
        class: classes("ldpp-plugins-tab", tab.id === category && "is-active"),
        attrs: { role: "tab", "aria-selected": String(tab.id === category) },
        on: { click: () => {
          category = tab.id;
          render();
        } }
      }, tab.label)));
      const list = visible();
      grid.replaceChildren(...list.map((plugin) => pluginCard(plugin, render)));
      if (!list.length) {
        grid.append(h("p", { class: "ldpp-muted ldpp-plugins-empty" }, query ? "没有匹配的功能。" : category === "favorites" ? "还没有收藏。点功能卡片上的 ☆ 收藏后会显示在这里。" : "没有功能。"));
      }
    };
    search.addEventListener("input", () => {
      query = search.value;
      render();
    });
    select.addEventListener("change", () => {
      filter = select.value;
      render();
    });
    render();
    if (focus && plugins[focus])
      requestAnimationFrame(() => openPluginDialog(plugins[focus]));
    return h("div", { class: "ldpp-plugins" }, tabBar, h("div", { class: "ldpp-plugins-toolbar" }, search, select), grid);
  }
  function renderNotifications() {
    return h("div", null, renderSettingsForm(plugins.Notifications) ?? Hint("无设置"), h("div", { class: "ldpp-row-actions" }, Button("预览通知", { onClick: previewToasts })));
  }
  function renderAbout() {
    return h("div", { class: "ldpp-about" }, h("h3", null, `LD++ ${"[20261023.4] v1.0.0"}`, InfoTip("请不要同时启用旧版「屏蔽脚本」与「总结脚本」：LD++ 已包含它们的全部功能，同时启用会重复处理话题列表。旧脚本的数据可在「数据」页导入。", { label: "注意", warning: true })), h("p", null, "LINUX DO 增强脚本：话题屏蔽、搜索过滤、话题 / 列表 AI 总结与追问、DeArrow 标题党改写、Google Drive 同步。"), h("p", { class: "ldpp-muted" }, `构建：${"5e51362"}`));
  }
  function openSettings(tab = "features", plugin) {
    dialog?.close();
    const tabs = Tabs([
      { id: "features", label: "功能", icon: PluginIcon, render: () => renderFeatures(plugin) },
      { id: "themes", label: "主题", icon: PaletteIcon, render: renderThemesTab },
      { id: "css", label: "快速 CSS", icon: BracesIcon, render: renderQuickCssTab },
      { id: "ai", label: "AI 接口", icon: BotIcon, render: renderProfileEditor },
      { id: "notifications", label: "通知", icon: BellIcon, render: renderNotifications },
      { id: "data", label: "数据", icon: DatabaseIcon, render: renderDataPanel },
      { id: "about", label: "关于", icon: InfoIcon, render: renderAbout }
    ], { initial: tab, vertical: true });
    dialog = openDialog({
      title: "LD++ 设置",
      icon: SettingsIcon(18),
      info: "开关和设置都立即生效，无需刷新页面。所有功能共用一套话题列表处理流程，彼此不会互相干扰。",
      size: "large",
      className: "ldpp-settings",
      body: h("div", { class: "ldpp-settings-layout" }, h("nav", { class: "ldpp-settings-nav" }, tabs.list), h("div", { class: "ldpp-settings-main" }, tabs.panel)),
      onClose: () => {
        dialog = null;
      }
    });
  }
  function ensureHeaderButton() {
    if (document.querySelector(".ldpp-header-item"))
      return;
    const icons = document.querySelector(".d-header-icons");
    if (!icons)
      return;
    const button = h("button", { type: "button", class: "icon btn btn-flat ldpp-header-button", title: "LD++ 设置", attrs: { "aria-label": "LD++ 设置" }, on: { click: () => openSettings() } }, SettingsIcon(18));
    icons.prepend(mark(h("li", { class: "header-dropdown-toggle ldpp-header-item" }, button), "header"));
  }
  var settings_default = definePlugin({
    name: "Settings",
    displayName: "设置",
    description: "LD++ 设置面板。",
    tags: ["core"],
    required: true,
    hidden: true,
    settings: settings7,
    startAt: "DOMContentLoaded" /* DOMContentLoaded */,
    start() {
      gmMenu("⚙️ LD++ 设置", () => openSettings());
      subscribe("openSettings", ({ tab, plugin }) => openSettings(tab, plugin));
      ensureHeaderButton();
      registerProcessor({ id: "header-button", run: ensureHeaderButton });
    },
    events: {
      pluginToggle({ name, enabled }) {
        const card = dialog?.root.querySelector(`.ldpp-plugin-card[data-plugin="${CSS.escape(name)}"]`);
        const input = card?.querySelector(".ldpp-plugin-card-controls input[type=checkbox]");
        if (!card || !input)
          return;
        input.checked = enabled;
        card.classList.toggle("is-off", !enabled);
      }
    }
  });

  // ldpp-css:src/plugins/topicSummary/styles.css
  registerStyle("topicSummary", `/*
 * The original script's sidebar: as wide as Discourse's own sidebar plus an offset (set from sidebar.ts), sliding
 * fully off the screen edge when closed, with its 20 × 60 handle on the outer edge left on screen.
 */
.ldpp-sidebar {
    --ldpp-sidebar-width: 270px;
    /* Side padding of the header and body; the panel can be as narrow as the native sidebar, so it stays small. */
    --ldpp-sidebar-pad: 0.6rem;

    position: fixed;
    /* Flush under the header and down to the window's bottom, like Discourse's own sidebar beside it. */
    top: var(--header-offset, 4rem);
    bottom: 0;
    z-index: 990;
    width: min(var(--ldpp-sidebar-width), calc(100vw - 20px));
    transition: transform 0.3s ease, width 0.3s ease;
}

.ldpp-sidebar.is-left {
    left: 0;
    transform: translateX(-100%);
}

.ldpp-sidebar.is-right {
    right: 0;
    transform: translateX(100%);
}

.ldpp-sidebar.is-open {
    transform: none;
}

.ldpp-sidebar-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    border: 1px solid var(--ldpp-line);
    background: var(--ldpp-bg);
    color: var(--ldpp-fg);
    box-shadow: var(--ldpp-shadow);
    contain: content;
}

/* A full-height column: only the edge facing the page has a border, no rounded corners. */
.ldpp-sidebar-panel.ldpp-sidebar-panel {
    border-block: 0;
    border-radius: 0;
}

.ldpp-sidebar.is-left .ldpp-sidebar-panel {
    border-left: 0;
}

.ldpp-sidebar.is-right .ldpp-sidebar-panel {
    border-right: 0;
}

/* Off screen it is out of the tab order and its shadow does not show at the edge; hidden once the slide ends. */
.ldpp-sidebar:not(.is-open) .ldpp-sidebar-panel {
    visibility: hidden;
    transition: visibility 0s 0.3s;
}

.ldpp-sidebar-handle {
    position: absolute;
    top: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 60px;
    margin: 0;
    padding: 0;
    border: 0;
    background: var(--ldpp-accent);
    color: #fff;
    font-size: 14px;
    line-height: 1;
    box-shadow: 0 2px 5px rgb(0 0 0 / 20%);
    cursor: pointer;
    transform: translateY(-50%);
}

.ldpp-sidebar.is-left .ldpp-sidebar-handle {
    right: -20px;
    border-radius: 0 5px 5px 0;
}

.ldpp-sidebar.is-right .ldpp-sidebar-handle {
    left: -20px;
    border-radius: 5px 0 0 5px;
}

/* The original's arrows, as it had them. */
.ldpp-sidebar-handle::after {
    content: "◀";
}

.ldpp-sidebar.is-open.is-left .ldpp-sidebar-handle::after {
    content: "▶";
}

.ldpp-sidebar-handle:focus-visible {
    outline: 2px solid var(--ldpp-accent);
    outline-offset: 2px;
}

.ldpp-sidebar-header {
    display: flex;
    flex: none;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.4rem 0.5rem var(--ldpp-sidebar-pad);
    border-bottom: 1px solid var(--ldpp-line);
}

/* The tabs fill the header left of ⚙; the panel can be as narrow as the native sidebar (100 px at the least). */
.ldpp-sidebar-header > .ldpp-sidebar-tabs {
    flex: 1 1 auto;
    min-width: 0;
}

.ldpp-sidebar-header > .ldpp-icon-btn {
    flex: none;
}

.ldpp-sidebar-body {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.6rem;
    min-height: 0;
    padding: 0.6rem var(--ldpp-sidebar-pad);
    overflow: auto;
    overscroll-behavior: contain;
}

/* On the 提问 tab the thread scrolls by itself and its composer stays at the bottom: the body does not scroll then. */
.ldpp-sidebar-body:has(> .ldpp-qa) {
    overflow: hidden;
}

.ldpp-sidebar-tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0.2rem;
    border-radius: 8px;
    background: var(--ldpp-soft);
}

.ldpp-sidebar-tab {
    flex: 1 1 0;
    min-width: 0;
    padding: 0.3rem 0.4rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    border: 0;
    border-radius: var(--ldpp-btn-radius);
    background: transparent;
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
    cursor: pointer;
}

@media (hover: hover) {
    .ldpp-sidebar-tab:not(.is-active):hover {
        background: var(--ldpp-flat-bg-hover);
        color: var(--ldpp-flat-text-hover);
    }
}

.ldpp-sidebar-tab.is-active {
    background: var(--ldpp-bg);
    color: var(--ldpp-fg);
    font-weight: 600;
    box-shadow: 0 1px 2px rgb(0 0 0 / 15%);
}

.ldpp-sv {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    min-width: 0;
}

.ldpp-sv-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
}

.ldpp-sv-spacer {
    flex: 1 1 auto;
}

.ldpp-sv-nav {
    display: inline-flex;
    align-items: center;
}

.ldpp-sv-nav .ldpp-icon-btn {
    width: 1.6rem;
    height: 1.6rem;
}

.ldpp-sv-count {
    min-width: 3.2em;
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
    text-align: center;
    font-variant-numeric: tabular-nums;
}

.ldpp-sv-loading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
    /* Retry statuses quote the failed request's URL. */
    overflow-wrap: anywhere;
}

.ldpp-sv-stale {
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
}

.ldpp-sv-meta {
    margin: 0;
    color: var(--ldpp-muted);
    font-size: 0.78rem;
}

.ldpp-sv-empty p {
    margin: 0 0 0.5rem;
    color: var(--ldpp-muted);
}

.ldpp-prompt-editor .ldpp-field-stack textarea {
    min-height: 6rem;
}
`);

  // src/api/Images.ts
  var logger9 = new Logger("Images");
  var MB2 = 1024 * 1024;
  var TRUSTED_HOSTS = ["linux.do", "ldstatic.com", "discourse-cdn.com"];
  var SUPPORTED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  var MAX_EDGE = 1600;
  var QUALITIES = [0.85, 0.72, 0.6, 0.48];
  var SHRINK = 0.7;
  function isTrustedImage(url) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return TRUSTED_HOSTS.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
    } catch {
      return false;
    }
  }
  function mimeOf(contentType, url) {
    const type = contentType.split(";")[0].trim().toLowerCase().replace("image/jpg", "image/jpeg");
    if (SUPPORTED.has(type))
      return type;
    const ext = url.toLowerCase().match(/\.(jpe?g|png|webp|gif)(?:$|[?#])/)?.[1];
    if (!ext)
      return type;
    return ext.startsWith("jp") ? "image/jpeg" : `image/${ext}`;
  }
  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader;
      reader.addEventListener("load", () => resolve(String(reader.result)));
      reader.addEventListener("error", () => reject(reader.error ?? new Error("读取图片失败")));
      reader.readAsDataURL(blob);
    });
  }
  async function compress(blob, maxBytes) {
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx)
        return null;
      let scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
      for (let round = 0;round < 4; round++, scale *= SHRINK) {
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        for (const quality of QUALITIES) {
          const out = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
          if (out && out.size <= maxBytes)
            return out;
        }
      }
      return null;
    } finally {
      bitmap.close();
    }
  }
  async function download(url, maxBytes, signal) {
    const res = await httpRequest({ url, responseType: "arraybuffer", timeout: 20000, signal, credentials: "include" });
    if (!res.ok || !res.buffer)
      throw new Error(`图片 HTTP ${res.status}`);
    const mime = mimeOf(res.contentType, url);
    if (!SUPPORTED.has(mime))
      throw new Error(`不支持的图片格式 ${mime || "未知"}`);
    const blob = new Blob([res.buffer], { type: mime });
    if (blob.size <= maxBytes)
      return blob;
    const smaller = await compress(blob, maxBytes);
    if (!smaller)
      throw new Error("图片过大且压缩失败");
    return smaller;
  }
  async function prepareImages(images, profile, signal) {
    const prepared = [];
    const skipped = [];
    if (!profile?.imageInput)
      return { prepared, skipped };
    const maxBytes = profile.maxImageMB * MB2;
    const maxTotal = profile.maxTotalImageMB * MB2;
    let total = 0;
    for (const image of images) {
      if (prepared.length >= profile.maxImages) {
        skipped.push({ id: image.id, reason: "超过单次图片数量上限" });
        continue;
      }
      if (!isTrustedImage(image.url)) {
        skipped.push({ id: image.id, reason: "站外图片" });
        continue;
      }
      try {
        const blob = await download(image.url, maxBytes, signal);
        if (total + blob.size > maxTotal) {
          skipped.push({ id: image.id, reason: "超过图片总大小上限" });
          continue;
        }
        total += blob.size;
        prepared.push({ id: image.id, url: await blobToDataUrl(blob), detail: profile.imageDetail, bytes: blob.size });
      } catch (error) {
        if (signal?.aborted)
          throw error;
        logger9.warn(`图片 #${image.id} 准备失败`, error);
        skipped.push({ id: image.id, reason: errorMessage(error) });
      }
    }
    return { prepared, skipped };
  }

  // src/api/TopicContent.ts
  var BLOCK_TAGS = new Set(["P", "DIV", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "TR", "TABLE", "UL", "OL", "ASIDE", "DETAILS", "SUMMARY", "HR"]);
  var SKIP_SELECTOR = "script, style, .meta, .lightbox-wrapper .meta, .cooked-date, .spoiler-blurred-images";
  var DECORATIVE = /\b(?:emoji|avatar|site-icon|favicon)\b/i;
  var DECORATIVE_URL = /\/(?:emoji|letter_avatar_proxy|user_avatar)\//i;
  function imageUrl(img) {
    const raw = img.getAttribute("data-orig-src") ?? img.getAttribute("data-src") ?? img.getAttribute("src") ?? "";
    const parent = img.closest("a.lightbox")?.getAttribute("href");
    const candidate = parent && /\.(?:png|jpe?g|gif|webp|avif)(?:$|\?)/i.test(parent) ? parent : raw;
    try {
      return new URL(candidate, location.origin).href;
    } catch {
      return "";
    }
  }
  function cookedToText(cooked, onImage) {
    const doc = new DOMParser().parseFromString(`<!doctype html><body>${cooked}`, "text/html");
    for (const el of Array.from(doc.querySelectorAll(SKIP_SELECTOR)))
      el.remove();
    const parts = [];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push(node.nodeValue ?? "");
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE)
        return;
      const el = node;
      const tag = el.tagName;
      if (tag === "BR")
        return void parts.push(`
`);
      if (tag === "IMG") {
        const img = el;
        const isDecorative = DECORATIVE.test(img.className) || DECORATIVE_URL.test(img.getAttribute("src") ?? "");
        parts.push(isDecorative ? img.alt || "" : onImage(img));
        return;
      }
      const block = BLOCK_TAGS.has(tag);
      if (block)
        parts.push(`
`);
      if (tag === "LI")
        parts.push("- ");
      if (tag === "BLOCKQUOTE" || el.classList.contains("quote"))
        parts.push("> ");
      for (const child of Array.from(el.childNodes))
        walk(child);
      if (tag === "A") {
        const href = el.getAttribute("href") ?? "";
        const label = normalizeText(el.textContent);
        if (/^https?:/i.test(href) && label && !href.includes(label))
          parts.push(` (${href})`);
      }
      if (block)
        parts.push(`
`);
    };
    walk(doc.body);
    return parts.join("").replace(/[ \t]+\n/g, `
`).replace(/\n{3,}/g, `

`).trim();
  }
  function formatPost(post, images) {
    const floor = post.post_number;
    const body = cookedToText(post.cooked ?? "", (img) => {
      const url = imageUrl(img);
      if (!url)
        return "";
      const image = { id: images.length + 1, url, alt: normalizeText(img.alt), floor, username: post.username };
      images.push(image);
      return `[图片#${image.id}${image.alt ? ` ${image.alt}` : ""}]`;
    });
    const reply = post.reply_to_user?.username ? ` 回复 ${post.reply_to_user.username}` : "";
    return `#${floor} ${post.username}${reply}：
${body}`;
  }
  async function loadPosts(topicId, firstPostOnly, options) {
    if (!firstPostOnly)
      return fetchAllPosts(topicId, options);
    const topic = await fetchTopic(topicId, options);
    return { title: normalizeText(topic.title), posts: topic.post_stream.posts.filter((post) => post.post_number === 1).slice(0, 1) };
  }
  async function buildTopicContent(topicId, { maxPosts = 0, firstPostOnly = false, ...options } = {}) {
    const { title, posts } = await loadPosts(topicId, firstPostOnly, options);
    const selected = maxPosts > 0 ? posts.slice(0, maxPosts) : posts;
    const images = [];
    const text = selected.map((post) => formatPost(post, images)).join(`

`);
    return { topicId, title, text, images, postCount: posts.length, truncated: selected.length < posts.length && !firstPostOnly };
  }

  // src/plugins/topicSummary/engine.ts
  var logger10 = new Logger("Summary", "#89dceb");
  var operations = new Map;
  var errors = new Map;
  var listeners3 = new Set;
  var remoteSources = new Set;
  var config = null;
  function configureEngine(next) {
    config = next;
  }
  function registerRemoteSource(source) {
    remoteSources.add(source);
    return () => remoteSources.delete(source);
  }
  function hasRemoteSource() {
    return remoteSources.size > 0;
  }
  function onSummaryState(listener) {
    listeners3.add(listener);
    return () => listeners3.delete(listener);
  }
  function notify(topicId) {
    for (const listener of Array.from(listeners3)) {
      try {
        listener(topicId);
      } catch (error) {
        logger10.error("状态监听出错", error);
      }
    }
  }
  function operationStatus(topicId) {
    return operations.get(topicId)?.status ?? null;
  }
  var isConfigError = (error) => error instanceof AIError && (error.code === "NO_KEY" || error.code === "NO_PROFILE");
  function lastError(topicId) {
    return errors.get(topicId);
  }
  function cancelSummary(topicId) {
    const op = operations.get(topicId);
    if (!op)
      return;
    op.controller.abort();
  }
  async function pullRemote(topicId, signal) {
    for (const source of remoteSources) {
      try {
        if (await source(topicId, signal ?? new AbortController().signal) && hasSummary(topicId))
          return true;
      } catch (error) {
        if (isAbortError(error))
          throw error;
        logger10.warn(`远端拉取话题 ${topicId} 失败`, error);
      }
    }
    return false;
  }
  function buildSummaryMessages(prompt, content, images, maxPosts) {
    const header = [
      `话题标题：${content.title || "（未知）"}`,
      `话题 ID：${content.topicId}`,
      `共 ${content.postCount} 楼${content.truncated ? `，为控制长度只提供前 ${maxPosts} 楼` : ""}。`,
      images.length ? `本次附带 ${images.length} 张话题图片，正文中的 [图片#N] 与之按编号对应。` : ""
    ].filter(Boolean).join(`
`);
    return [
      { role: "system", content: [prompt.system, prompt.format].filter(Boolean).join(`

`) },
      { role: "user", content: userContent(`${header}

原文如下：
${content.text}`, images) }
    ];
  }
  async function summarizeTopic(topicId, { mode = "manual", force = false } = {}) {
    if (!config)
      throw new Error("总结引擎尚未配置");
    const running = operations.get(topicId);
    if (running && !force) {
      showToast("该话题正在总结中，请稍候…", "info", { topicId });
      return false;
    }
    running?.toast.close();
    running?.controller.abort();
    const controller = new AbortController;
    const op = {
      id: randomId("op-"),
      topicId,
      mode,
      controller,
      status: "准备中…",
      toast: showToast(mode === "auto" ? "正在自动总结…" : "正在生成总结…", "loading", {
        topicId,
        key: `summary:${topicId}`,
        onDismiss: () => controller.abort(),
        onClick: () => focusTopic(topicId)
      })
    };
    operations.set(topicId, op);
    errors.delete(topicId);
    const { signal } = controller;
    const setStatus = (status) => {
      if (operations.get(topicId) !== op)
        return;
      op.status = status;
      op.toast.update(status, "loading");
      notify(topicId);
    };
    const guard = () => {
      if (signal.aborted)
        throw abortError("总结已取消");
      if (mode === "auto" && currentRoute().topicId !== topicId)
        throw abortError("已离开话题，自动总结取消");
    };
    notify(topicId);
    try {
      if (!hasSummary(topicId) && Summarized.has(topicId) && hasRemoteSource()) {
        setStatus("正在从云端拉取已有总结…");
        if (await pullRemote(topicId, signal)) {
          op.toast.update("已从云端拉取总结", "success");
          return true;
        }
        guard();
      }
      const profile = requireProfile(getProfile());
      const maxPosts = config.maxPosts();
      setStatus("正在读取话题内容…");
      const content = await buildTopicContent(topicId, {
        signal,
        maxPosts,
        retries: profile.retryCount,
        onRetry: (info) => setStatus(`linux.do 限流，${info.delaySeconds} 秒后重试（${info.attempt}/${info.total}）…`)
      });
      rememberTopicTitle(topicId, content.title);
      guard();
      let images = [];
      if (profile.imageInput && content.images.length) {
        setStatus(`正在准备图片（${content.images.length} 张）…`);
        images = (await prepareImages(content.images, profile, signal)).prepared;
        guard();
      }
      const prompt = config.prompt();
      setStatus("AI 正在生成总结…");
      const raw = await chatWithRetry(profile, buildSummaryMessages(prompt, content, images, maxPosts), {
        signal,
        onRetry: (notice) => {
          if (mode === "auto" && hasSummary(topicId))
            controller.abort();
          setStatus(`生成失败（${errorMessage(notice.error)}），${profile.retryInterval} 秒后第 ${notice.attempt}/${notice.total} 次重试…`);
        }
      });
      guard();
      if (mode === "auto" && hasSummary(topicId)) {
        op.toast.update("已有总结，已停止自动总结", "success");
        return true;
      }
      const filter = config.filter();
      const summary = filter.enabled ? stripFences(raw, filter.prefixes, filter.suffixes) : raw.trim();
      addSummary(topicId, { summary, timestamp: new Date().toISOString(), model: profile.model || "未知模型", renderMode: renderModeOf(prompt, summary) });
      op.toast.update(mode === "auto" ? "自动总结完成" : "总结完成", "success");
      return true;
    } catch (error) {
      if (isAbortError(error)) {
        op.toast.close();
        return false;
      }
      errors.set(topicId, error);
      if (mode === "auto" && isConfigError(error)) {
        logger10.info(`话题 ${topicId} 未自动总结：${errorMessage(error)}`);
        op.toast.close();
        return false;
      }
      logger10.error(`话题 ${topicId} 总结失败`, error);
      op.toast.update(`总结失败：${errorMessage(error)}`, "error");
      return false;
    } finally {
      if (operations.get(topicId) === op)
        operations.delete(topicId);
      notify(topicId);
    }
  }

  // src/plugins/topicSummary/promptEditor.ts
  function renderPromptEditor(store) {
    const root = h("div", { class: "ldpp-prompt-editor" });
    const render = () => {
      const list = store.list();
      const active = list.find((prompt) => prompt.id === store.activeId()) ?? list[0];
      const update = (patch) => store.save(store.list().map((prompt) => prompt.id === active.id ? { ...prompt, ...patch } : prompt));
      root.replaceChildren(Field("当前使用", Select(active.id, list.map((prompt) => ({ label: prompt.name, value: prompt.id })), (value) => {
        store.setActive(value);
        render();
      })), h("div", { class: "ldpp-row-actions" }, Button("新建", { small: true, icon: PlusIcon(), onClick: () => {
        const created = { ...DEFAULT_PROMPTS[0], id: randomId("prompt-"), name: "新提示词" };
        store.save([...list, created]);
        store.setActive(created.id);
        render();
      } }), Button("复制", { small: true, icon: CopyIcon(), onClick: () => {
        const copy = { ...active, id: randomId("prompt-"), name: `${active.name} 副本` };
        store.save([...list, copy]);
        store.setActive(copy.id);
        render();
      } }), Button("删除", { small: true, kind: "delete", icon: TrashIcon(), disabled: list.length <= 1, onClick: async () => {
        if (!await confirmDialog(`确定删除提示词「${active.name}」吗？`, { title: "删除提示词", danger: true, okLabel: "删除" }))
          return;
        const rest = store.list().filter((prompt) => prompt.id !== active.id);
        store.save(rest);
        store.setActive(rest[0].id);
        render();
      } }), Button("恢复默认提示词", { small: true, icon: RefreshIcon(), onClick: async () => {
        if (!await confirmDialog("恢复后自定义的提示词会被删除，确定吗？", { title: "恢复默认提示词", danger: true, icon: RefreshIcon(18), okLabel: "恢复" }))
          return;
        store.save(structuredClone(DEFAULT_PROMPTS));
        store.setActive(DEFAULT_PROMPTS[0].id);
        render();
      } }), InfoTip("总结时会把话题标题、楼层数与全部楼层正文（#楼层 用户名：内容）作为用户消息发送。")), Field("名称", TextInput({ value: active.name, onChange: (value) => {
        update({ name: value.trim() || active.name });
        render();
      } })), SubTabs([
        { label: () => "总结方法（system 提示词）", render: () => TextInput({ value: active.system, multiline: true, rows: 4, onChange: (value) => update({ system: value }) }) },
        { label: () => "输出格式", render: () => h("div", null, h("p", { class: "ldpp-muted ldpp-settings-group-desc" }, "输出格式里写明 Markdown 或 HTML，LD++ 会按对应方式渲染（HTML 会经过安全过滤）。"), TextInput({ value: active.format, multiline: true, rows: 4, onChange: (value) => update({ format: value }) })) }
      ]).el);
    };
    render();
    return root;
  }

  // ldpp-css:src/plugins/sidebarWidth/styles.css
  registerStyle("sidebarWidth", `/* Drag handle in the gap right of Discourse's sidebar: fixed, outside .sidebar-wrapper (sticky + scrolling). */
/* Not .ldpp-sidebar-handle: that is the topic page's 「AI」 sidebar tab (topicSummary), which has a border and padding. */
.ldpp-sidebar-width-handle {
    position: fixed;
    z-index: 200;
    width: 10px;
    cursor: col-resize;
    touch-action: none;
}

.ldpp-sidebar-width-handle[hidden] {
    display: none;
}

.ldpp-sidebar-width-handle::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 3px;
    width: 4px;
    border-radius: 2px;
    transition: background-color 0.2s ease;
}

.ldpp-sidebar-width-handle:hover::after {
    background: var(--primary-low-mid, rgb(127 127 127 / 35%));
}

.ldpp-sidebar-width-handle.is-active::after {
    background: var(--tertiary, #08c);
}

html.ldpp-sidebar-width-resizing,
html.ldpp-sidebar-width-resizing * {
    cursor: col-resize !important;
    user-select: none !important;
}
`);

  // src/plugins/sidebarWidth/index.ts
  var DEFAULT_WIDTH = 250;
  var MIN_WIDTH = 100;
  var MAX_SETTING = 600;
  var MIN_MAIN = 200;
  var LEGACY_KEY = "discourseSidebarWidth";
  var LAYOUT_STYLE = "sidebarWidth-layout";
  var settings8 = definePluginSettings({
    width: {
      type: 4 /* SLIDER */,
      description: "侧边栏宽度（也可以拖动侧边栏右侧边缘调整，双击边缘恢复默认）。",
      min: MIN_WIDTH,
      max: MAX_SETTING,
      step: 1,
      unit: "px",
      default: DEFAULT_WIDTH
    },
    topThird: {
      type: 2 /* BOOLEAN */,
      description: "只在侧边栏顶部 1/3 高度内可拖动（关闭后整条右边缘都可拖动）",
      default: true
    },
    legacyImported: {
      type: 6 /* CUSTOM */,
      default: false
    }
  });
  function parseLegacyWidth(raw) {
    const value = Number.parseInt(raw ?? "", 10);
    return Number.isFinite(value) && value >= MIN_WIDTH ? Math.min(value, MAX_SETTING) : null;
  }
  function clampWidth(width, room) {
    return Math.round(Math.max(MIN_WIDTH, Math.min(width, Math.max(MIN_WIDTH, room - MIN_MAIN))));
  }
  var currentWidth = () => Number(settings8.store.width) || DEFAULT_WIDTH;
  function applyWidth(width = currentWidth()) {
    registerStyle(LAYOUT_STYLE, `body:not(.mobile-view) #main-outlet-wrapper { --d-sidebar-width: ${Math.round(width)}px !important; }`);
  }
  function sidebar() {
    const body = document.body;
    if (!body || body.classList.contains("mobile-view") || !body.classList.contains("has-sidebar-page"))
      return null;
    const el = document.querySelector("#main-outlet-wrapper > .sidebar-wrapper");
    return el && el.offsetWidth > 0 ? el : null;
  }
  function roomOf(wrapper) {
    const box = getComputedStyle(wrapper);
    return wrapper.clientWidth - parseFloat(box.paddingLeft) - parseFloat(box.paddingRight) - (parseFloat(box.columnGap) || 0);
  }
  var handle = null;
  var bodyWatcher = null;
  var sizeWatcher = null;
  var watched = null;
  var frame2 = 0;
  var warnedLegacy2 = false;
  function place() {
    frame2 = 0;
    if (!handle)
      return;
    if (!handle.isConnected)
      document.body.append(handle);
    const target = document.querySelector("#main-outlet-wrapper > .sidebar-wrapper");
    if (target !== watched) {
      sizeWatcher?.disconnect();
      if (target)
        sizeWatcher?.observe(target);
      watched = target;
    }
    if (!warnedLegacy2 && document.getElementById("discourse-resizer")) {
      warnedLegacy2 = true;
      showToast("「Sidebar ↔️ Enhancer」脚本仍在运行，它会在折叠侧边栏时打乱布局；LD++ 已内置这个功能，请在脚本管理器中停用旧脚本。", "warning", { key: "sidebar-width-legacy" });
    }
    const el = sidebar();
    if (!el) {
      handle.hidden = true;
      return;
    }
    const rect = el.getBoundingClientRect();
    handle.hidden = false;
    handle.style.left = `${rect.right}px`;
    handle.style.top = `${rect.top}px`;
    handle.style.height = `${handleHeight(rect.height, settings8.store.topThird !== false)}px`;
  }
  function handleHeight(sidebarHeight, topThird) {
    return Math.round(topThird ? sidebarHeight / 3 : sidebarHeight);
  }
  function schedule3() {
    if (!frame2)
      frame2 = requestAnimationFrame(place);
  }
  function onPointerDown2(event) {
    const el = sidebar();
    if (!handle || !el || event.button !== 0)
      return;
    event.preventDefault();
    const rect = el.getBoundingClientRect();
    const grab = event.clientX - rect.right;
    const room = roomOf(el.parentElement);
    const target = handle;
    let width = Math.round(rect.width);
    try {
      target.setPointerCapture(event.pointerId);
    } catch {}
    target.classList.add("is-active");
    document.documentElement.classList.add("ldpp-sidebar-width-resizing");
    const move = (e) => {
      width = clampWidth(e.clientX - grab - rect.left, room);
      applyWidth(width);
      schedule3();
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      target.classList.remove("is-active");
      document.documentElement.classList.remove("ldpp-sidebar-width-resizing");
      settings8.store.width = width;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }
  function onDoubleClick() {
    settings8.reset("width");
    applyWidth();
    schedule3();
  }
  function mount() {
    if (handle)
      return;
    handle = mark(h("div", { class: "ldpp-sidebar-width-handle", title: "拖动调整侧边栏宽度，双击恢复默认", hidden: true }), "sidebar-handle");
    handle.addEventListener("pointerdown", onPointerDown2);
    handle.addEventListener("dblclick", onDoubleClick);
    document.body.append(handle);
    sizeWatcher = new ResizeObserver(schedule3);
    bodyWatcher = new MutationObserver(schedule3);
    bodyWatcher.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    window.addEventListener("resize", schedule3);
    window.addEventListener("scroll", schedule3, { passive: true });
    schedule3();
  }
  var sidebarWidth_default = definePlugin({
    name: "SidebarWidth",
    displayName: "侧边栏宽度",
    description: "拖动左侧边栏的右边缘调整宽度，宽度会记住；折叠侧边栏时正文正常铺满。双击边缘恢复默认宽度。",
    tags: ["reading"],
    icon: PanelLeftIcon,
    enabledByDefault: true,
    settings: settings8,
    start() {
      if (!settings8.store.legacyImported) {
        const legacy = parseLegacyWidth(localStorage.getItem(LEGACY_KEY));
        if (legacy != null)
          settings8.store.width = legacy;
        settings8.store.legacyImported = true;
      }
      applyWidth();
      onReady(mount);
    },
    stop() {
      if (frame2)
        cancelAnimationFrame(frame2);
      frame2 = 0;
      bodyWatcher?.disconnect();
      sizeWatcher?.disconnect();
      bodyWatcher = sizeWatcher = null;
      watched = null;
      window.removeEventListener("resize", schedule3);
      window.removeEventListener("scroll", schedule3);
      handle?.remove();
      handle = null;
      unregisterStyle(LAYOUT_STYLE);
    },
    onSettingsChange() {
      applyWidth();
      schedule3();
    }
  });

  // ldpp-css:src/plugins/topicQA/styles.css
  registerStyle("topicQA", `/*
 * 提问: a chat thread over a composer. In the sidebar the thread scrolls on its own and the composer stays at the
 * bottom (the sidebar body stops scrolling, so there is one scrollbar); in a list row both flow and the list panel
 * caps the thread's height.
 */
.ldpp-qa {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    min-width: 0;
    min-height: 0;
}

.ldpp-qa-sidebar {
    flex: 1 1 auto;
}

.ldpp-qa-thread {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-height: 0;
}

/* The thread's scrollbar sits at the panel edge, as the sidebar body's did. */
.ldpp-qa-sidebar .ldpp-qa-thread {
    flex: 1 1 auto;
    margin-inline: calc(-1 * var(--ldpp-sidebar-pad, 0.6rem));
    padding-inline: var(--ldpp-sidebar-pad, 0.6rem);
    overflow-y: auto;
    overscroll-behavior: contain;
}

/* A short conversation sits just above the composer, as in chat apps; a long one scrolls from the top. */
.ldpp-qa-thread > :first-child {
    margin-top: auto;
}

.ldpp-qa-empty {
    margin: 0;
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
    line-height: 1.5;
}

.ldpp-qa-turn {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    min-width: 0;
}

/* The question: a full-width tinted block (not a chat bubble), then the answer as plain content below it. */
.ldpp-qa-q {
    padding: 0.45rem 0.6rem;
    border-radius: var(--ldpp-radius);
    background: var(--ldpp-soft);
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.ldpp-qa-tag {
    display: inline-block;
    margin-inline-end: 0.35rem;
    padding: 0 0.45rem;
    border-radius: 999px;
    background: var(--ldpp-accent-soft);
    font-size: var(--ldpp-font-sm);
    line-height: 1.5;
    white-space: nowrap;
}

.ldpp-qa-a {
    min-width: 0;
}

.ldpp-qa-meta {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--ldpp-muted);
    font-size: 0.78rem;
}

.ldpp-qa-meta > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ldpp-qa-meta .ldpp-icon-btn {
    flex: none;
    width: 1.6rem;
    height: 1.6rem;
    margin-inline-start: auto;
}

.ldpp-qa-pending {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
}

.ldpp-qa-composer {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: 0.45rem;
}

/* In a list row the panel is wide: the preset chips go left of the question box instead of taking a row of their own. */
.ldpp-qa-list {
    container-type: inline-size;
}

@container (min-width: 30rem) {
    .ldpp-qa-list .ldpp-qa-composer {
        flex-direction: row;
        align-items: center;
    }

    .ldpp-qa-list .ldpp-qa-chips:not(:empty) {
        display: flex;
        flex: 0 1 auto;
        flex-wrap: wrap;
        max-width: 40%;
    }

    .ldpp-qa-list .ldpp-qa-box {
        flex: 1 1 auto;
        min-width: 0;
    }
}

/* Presets as chips right above the box: one click puts the question in it to edit or send. */
/* Equal columns: two short presets share one row even in a sidebar as narrow as Discourse's; more wrap in step. */
.ldpp-qa-chips {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(4.2rem, 1fr));
    gap: 0.3rem;
}

.ldpp-qa-chips:empty {
    display: none;
}

.ldpp-qa-chip {
    min-width: 0;
    margin: 0;
    padding: 0.2rem 0.4rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    border: 1px solid var(--ldpp-line);
    border-radius: 999px;
    background: transparent;
    color: var(--ldpp-fg);
    font: inherit;
    font-size: var(--ldpp-font-sm);
    line-height: 1.4;
    cursor: pointer;
}

@media (hover: hover) {
    .ldpp-qa-chip:hover {
        background: var(--ldpp-flat-bg-hover);
        color: var(--ldpp-flat-text-hover);
    }
}

.ldpp-qa-chip:focus-visible {
    outline: 2px solid var(--ldpp-accent);
    outline-offset: 1px;
}

/* The question box: the text grows from one line, the send / stop button sits inside at its bottom right. */
.ldpp-qa-box {
    position: relative;
    display: flex;
    align-items: flex-end;
    gap: 0.35rem;
    padding: 0.3rem 0.3rem 0.3rem 0.65rem;
    border: 1px solid var(--ldpp-line);
    border-radius: 10px;
    background: var(--ldpp-bg);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.ldpp-qa-box:focus-within {
    border-color: var(--ldpp-accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--ldpp-accent) 35%, transparent);
}

textarea.ldpp-qa-input.ldpp-qa-input {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    margin: 0;
    padding: 0.3rem 0;
    border: 0;
    border-radius: 0;
    outline: 0;
    background: transparent;
    box-shadow: none;
    color: var(--ldpp-fg);
    font: inherit;
    font-size: var(--ldpp-font-sm);
    line-height: 1.5;
    resize: none;
}

textarea.ldpp-qa-input.ldpp-qa-input:focus {
    outline: 0;
    box-shadow: none;
}

textarea.ldpp-qa-input::placeholder {
    color: var(--ldpp-muted);
    opacity: 1;
}

.ldpp-icon-btn.ldpp-qa-send {
    flex: none;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    background: var(--ldpp-accent);
    color: #fff;
}

.ldpp-icon-btn.ldpp-qa-send:disabled {
    background: var(--ldpp-soft);
    color: var(--ldpp-muted);
    cursor: default;
}

.ldpp-icon-btn.ldpp-qa-send.is-stop {
    background: var(--ldpp-soft);
    color: var(--ldpp-fg);
}

@media (hover: hover) {
    .ldpp-icon-btn.ldpp-qa-send:not(:disabled):hover {
        filter: brightness(1.1);
    }
}

.ldpp-qa-menu {
    position: absolute;
    bottom: calc(100% + 0.3rem);
    left: 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    min-width: min(12rem, 100%);
    padding: 0.25rem;
    border: 1px solid var(--ldpp-line);
    border-radius: var(--ldpp-radius);
    background: var(--ldpp-bg);
    box-shadow: var(--ldpp-shadow);
}

.ldpp-qa-menu[hidden] {
    display: none;
}

.ldpp-qa-menu-item {
    padding: 0.4rem 0.6rem;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--ldpp-fg);
    text-align: left;
    cursor: pointer;
}

.ldpp-qa-menu-item:hover,
.ldpp-qa-menu-item:focus-visible {
    background: var(--ldpp-flat-bg-hover);
}

.ldpp-preset-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2.5fr) auto;
    align-items: start;
    gap: 0.4rem;
    margin-bottom: 0.4rem;
}
`);

  // src/plugins/topicQA/index.ts
  var logger11 = new Logger("TopicQA", "#cba6f7");
  var CONTENT_TTL_MS = 5 * 60000;
  var BUILTIN_PRESETS = [
    { id: "builtin-resolved", name: "是否解决", prompt: "这个话题里的主要问题或诉求解决了吗？请给出结论、关键依据和仍需确认的点。" },
    { id: "builtin-best", name: "最佳方案", prompt: "请从话题和回复中提炼目前最佳的方案：推荐做法、操作步骤、适用条件，以及风险或替代方案。" }
  ];
  function normalizePresets(raw) {
    if (!Array.isArray(raw))
      return [];
    return raw.filter(isObject).map((item, index) => ({
      id: asString(item.id) || `custom-${index + 1}`,
      name: asString(item.name) || `自定义预设 ${index + 1}`,
      prompt: asString(item.prompt)
    })).filter((item) => item.prompt);
  }
  function renderPresetEditor() {
    const root = h("div", { class: "ldpp-preset-editor" });
    const render = () => {
      const presets = normalizePresets(settings9.store.presets);
      const save = (next) => {
        settings9.store.presets = next;
      };
      root.replaceChildren(...presets.map((preset, index) => h("div", { class: "ldpp-preset-row" }, TextInput({ value: preset.name, placeholder: "名称", onChange: (value) => save(presets.map((item, i) => i === index ? { ...item, name: value.trim() || item.name } : item)) }), TextInput({ value: preset.prompt, multiline: true, rows: 2, placeholder: "预设问题", onChange: (value) => save(presets.map((item, i) => i === index ? { ...item, prompt: value.trim() } : item).filter((item) => item.prompt)) }), IconButton(TrashIcon(), { title: "删除", onClick: () => {
        save(presets.filter((_, i) => i !== index));
        render();
      } }))), h("div", { class: "ldpp-row-actions" }, Button("添加预设", { icon: PlusIcon(), small: true, onClick: () => {
        save([...presets, { id: randomId("preset-"), name: "新预设", prompt: "请基于这个话题回答：" }]);
        render();
      } }), InfoTip(`内置预设：${BUILTIN_PRESETS.map((preset) => preset.name).join("、")}。下面可添加自己的预设；在提问框为空时输入 / 也能快速选择。`)));
    };
    render();
    return root;
  }
  var settings9 = definePluginSettings({
    presets: {
      type: 6 /* CUSTOM */,
      default: []
    },
    presetEditor: {
      type: 5 /* COMPONENT */,
      description: "提问预设",
      render: renderPresetEditor
    },
    historyTurns: {
      type: 4 /* SLIDER */,
      description: "追问时带上最近几轮问答作为上下文。",
      min: 0,
      max: 20,
      default: 8
    }
  });
  function allPresets() {
    return [...BUILTIN_PRESETS, ...normalizePresets(settings9.store.presets)];
  }
  var contentCache = new Map;
  var running = new Map;
  var pending2 = new Map;
  var stateListeners = new Set;
  var questionSources = new Set;
  function registerQuestionSource(source) {
    questionSources.add(source);
    return () => questionSources.delete(source);
  }
  function notify2(topicId) {
    for (const listener of Array.from(stateListeners))
      listener(topicId);
  }
  async function topicContent(topicId, profile, signal) {
    const cached = contentCache.get(topicId);
    if (cached && Date.now() - cached.at < CONTENT_TTL_MS)
      return cached.content;
    const content = await buildTopicContent(topicId, { signal, retries: profile.retryCount });
    contentCache.set(topicId, { content, at: Date.now() });
    return content;
  }
  function buildQuestionMessages(content, question, history, imageCount) {
    const past = history.map((item, i) => `追问 ${i + 1}
问：${item.question}
答：${item.answer}`).join(`

`);
    const text = [
      `话题标题：${content.title}`,
      imageCount ? `本次附带 ${imageCount} 张话题图片，正文中的 [图片#N] 与之按编号对应。` : "",
      past ? `已有问答：
${past}` : "已有问答：无",
      `用户问题：${question}`,
      `话题原文：
${content.text}`
    ].filter(Boolean).join(`

`);
    return [
      { role: "system", content: "你是严谨的技术话题阅读助手。只根据提供的话题原文和已有问答作答，不要编造原文没有的信息；证据不足时明确说明还需要确认什么。使用简体中文和 Markdown。" },
      { role: "user", content: text }
    ];
  }
  async function askTopic(topicId, question, preset) {
    if (running.has(topicId))
      return false;
    const controller = new AbortController;
    running.set(topicId, controller);
    pending2.set(topicId, { question, presetName: preset?.name ?? "" });
    notify2(topicId);
    try {
      const profile = requireProfile(getProfile());
      const content = await topicContent(topicId, profile, controller.signal);
      const images = profile.imageInput && content.images.length ? (await prepareImages(content.images, profile, controller.signal)).prepared : [];
      const turns = settings9.store.historyTurns;
      const history = turns > 0 ? (Questions.get(topicId) ?? []).slice(0, turns).toReversed() : [];
      const messages = buildQuestionMessages(content, question, history, images.length);
      messages[1].content = userContent(messages[1].content, images);
      const answer = await chatWithRetry(profile, messages, {
        signal: controller.signal,
        onRetry: (notice) => showToast(`提问失败，第 ${notice.attempt}/${notice.total} 次重试…`, "warning", { topicId, key: `qa:${topicId}`, onClick: () => focusTopic(topicId, "question") })
      });
      addQuestion(topicId, { id: randomId("qa-"), question, answer, presetId: preset?.id ?? "", presetName: preset?.name ?? "", timestamp: new Date().toISOString(), model: profile.model || "未知模型" });
      return true;
    } catch (error) {
      if (isAbortError(error))
        return false;
      logger11.error("提问失败", error);
      showToast(`提问失败：${errorMessage(error)}`, "error", { topicId, key: `qa:${topicId}`, onClick: () => focusTopic(topicId, "question") });
      throw error;
    } finally {
      running.delete(topicId);
      pending2.delete(topicId);
      notify2(topicId);
    }
  }
  function turn(question, presetName, ...rest) {
    return h("article", { class: "ldpp-qa-turn" }, h("div", { class: "ldpp-qa-q" }, presetName ? h("span", { class: "ldpp-qa-tag" }, presetName) : null, question), ...rest);
  }
  function createQAPanel(topicId, { variant = "sidebar" } = {}) {
    let failed = null;
    let chosen;
    const thread = trackScrollbar(h("div", { class: "ldpp-qa-thread" }));
    const input = autoGrow(h("textarea", {
      class: "ldpp-qa-input",
      rows: 1,
      placeholder: "输入问题…",
      title: "Ctrl/⌘ + Enter 发送；输入框为空时按 / 选择预设",
      attrs: { "aria-label": "问题" }
    }), () => Math.round(window.innerHeight * 0.3));
    const menu = h("div", { class: "ldpp-qa-menu", hidden: true, attrs: { role: "menu" } });
    const chips = h("div", { class: "ldpp-qa-chips", attrs: { "aria-label": "提问预设" } });
    const sendButton = IconButton(ArrowUpIcon(16), { title: "发送（Ctrl/⌘ + Enter）", className: "ldpp-qa-send" });
    const box = h("div", { class: "ldpp-qa-box" }, menu, input, sendButton);
    const el = h("div", { class: `ldpp-qa ldpp-qa-${variant}` }, thread, h("div", { class: "ldpp-qa-composer" }, chips, box));
    const busy = () => running.has(topicId);
    const fill = (preset) => {
      chosen = preset;
      input.value = preset.prompt;
      input.dispatchEvent(new Event("input"));
      menu.hidden = true;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    };
    const renderPresets = () => {
      const list = allPresets();
      chips.replaceChildren(...list.map((preset) => h("button", { type: "button", class: "ldpp-qa-chip", title: preset.prompt, on: { click: () => fill(preset) } }, preset.name)));
      menu.replaceChildren(...list.map((preset) => h("button", { type: "button", class: "ldpp-qa-menu-item", attrs: { role: "menuitem" }, on: { click: () => fill(preset) } }, preset.name)));
    };
    const renderThread = () => {
      const records = (Questions.get(topicId) ?? []).toReversed();
      const asking = pending2.get(topicId);
      const items = records.map((record) => turn(record.question, record.presetName, h("div", { class: "ldpp-content ldpp-qa-a", innerHTML: renderMarkdown(record.answer) }), h("div", { class: "ldpp-qa-meta" }, h("span", null, `\uD83D\uDD52 ${formatTime(record.timestamp)} · \uD83E\uDD16 ${record.model}`), IconButton(CopyIcon(14), { title: "复制回答", onClick: (event) => void copyWithFeedback(event.currentTarget, record.answer) }))));
      if (asking) {
        items.push(turn(asking.question, asking.presetName, h("div", { class: "ldpp-qa-pending" }, h("span", { class: "ldpp-spinner" }), "AI 正在回答…")));
      } else if (failed) {
        const { question, preset, error } = failed;
        const details = describeError(error);
        items.push(turn(question, preset?.name ?? "", h("div", { class: "ldpp-error-box ldpp-qa-error" }, h("strong", null, `提问失败：${errorMessage(error)}`), h("details", null, h("summary", null, "完整报错"), h("pre", { class: "ldpp-pre" }, details)), h("div", { class: "ldpp-row-actions" }, Button("重试", { small: true, kind: "primary", onClick: () => void submit(question, preset) }), Button("复制报错", { small: true, onClick: (event) => void copyWithFeedback(event.currentTarget, details) })))));
      }
      if (!items.length)
        items.push(h("p", { class: "ldpp-qa-empty" }, "向 AI 提问这个话题，回答只依据话题内容。"));
      thread.replaceChildren(...items);
      requestAnimationFrame(() => {
        thread.scrollTop = thread.scrollHeight;
      });
    };
    const renderControls = () => {
      const answering = busy();
      sendButton.replaceChildren(answering ? StopIcon(14) : ArrowUpIcon(16));
      sendButton.classList.toggle("is-stop", answering);
      sendButton.title = answering ? "停止回答" : "发送（Ctrl/⌘ + Enter）";
      sendButton.setAttribute("aria-label", sendButton.title);
      sendButton.disabled = !answering && !input.value.trim();
    };
    const submit = async (question = input.value.trim(), preset = chosen?.prompt === question ? chosen : undefined) => {
      if (!question || busy())
        return;
      failed = null;
      const typed = question === input.value.trim();
      if (typed) {
        input.value = "";
        input.dispatchEvent(new Event("input"));
        chosen = undefined;
      }
      try {
        await askTopic(topicId, question, preset);
      } catch (error) {
        failed = { question, preset, error };
      }
      renderThread();
      renderControls();
      if (!busy())
        input.focus();
    };
    sendButton.addEventListener("click", () => {
      if (busy())
        running.get(topicId)?.abort();
      else
        submit();
    });
    input.addEventListener("keydown", (event) => {
      if (event.isComposing)
        return;
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        submit();
      } else if (event.key === "/" && !input.value.trim()) {
        event.preventDefault();
        menu.hidden = false;
      } else if (event.key === "Escape" && !menu.hidden) {
        event.stopPropagation();
        menu.hidden = true;
      }
    });
    input.addEventListener("input", () => {
      if (input.value.trim())
        menu.hidden = true;
      renderControls();
    });
    renderPresets();
    renderThread();
    renderControls();
    const onState = (id) => {
      if (id !== topicId)
        return;
      renderThread();
      renderControls();
    };
    stateListeners.add(onState);
    const unsubs = [
      () => stateListeners.delete(onState),
      subscribe("dataChange", ({ store, ids }) => {
        if (store === "questions" && ids.includes(topicId))
          renderThread();
      })
    ];
    for (const source of questionSources)
      source(topicId).catch((error) => logger11.warn("拉取问答历史失败", error));
    return {
      el,
      focus: () => requestAnimationFrame(() => input.focus()),
      destroy: () => {
        for (const unsub of unsubs.splice(0))
          unsub();
      }
    };
  }
  var topicQA_default = definePlugin({
    name: "TopicQA",
    displayName: "提问 / 追问",
    description: "针对当前话题向 AI 提问并保存问答记录；支持内置与自定义提问预设，在侧栏和列表总结面板中都可使用。",
    tags: ["ai", "reading"],
    icon: QuestionIcon,
    enabledByDefault: true,
    settings: settings9
  });

  // src/plugins/topicSummary/view.ts
  function createSummaryView(topicId, { variant, onAsk }) {
    const el = h("div", { class: `ldpp-sv ldpp-sv-${variant}`, dataset: { topicId } });
    const toolbar = h("div", { class: "ldpp-sv-toolbar" });
    const body = h("div", { class: "ldpp-sv-body" });
    el.append(toolbar, body);
    let index = 0;
    let signature = "";
    let pulling = false;
    let seenConnected = false;
    const render = () => {
      const list = Summaries.get(topicId) ?? [];
      index = Math.min(index, Math.max(0, list.length - 1));
      const status = operationStatus(topicId);
      const error = status ? null : lastError(topicId);
      const record = list[index];
      const next = `${status}|${error ? errorMessage(error) : ""}|${list.length}|${index}|${record?.timestamp ?? ""}|${pulling}`;
      if (next === signature)
        return;
      signature = next;
      toolbar.replaceChildren();
      const meta = record ? `\uD83D\uDD52 ${formatTime(record.timestamp)} · \uD83E\uDD16 ${record.model}` : "";
      const inlineMeta = variant === "list" && meta;
      append(toolbar, status ? IconButton(StopIcon(14), { title: "停止总结", onClick: () => cancelSummary(topicId) }) : list.length ? IconButton(RefreshIcon(15), { title: "重新总结", onClick: () => void summarizeTopic(topicId, { force: true }) }) : Button("生成总结", { small: true, kind: "primary", icon: SparkIcon(14), onClick: () => void summarizeTopic(topicId) }), record ? IconButton(CopyIcon(15), { title: "复制总结原文", onClick: (event) => void copyWithFeedback(event.currentTarget, record.summary) }) : null, onAsk ? IconButton(QuestionIcon(16), { title: "提问 / 追问", onClick: onAsk }) : null, h("span", { class: "ldpp-sv-spacer" }), inlineMeta ? h("span", { class: "ldpp-sv-meta", title: meta }, meta) : null, list.length > 1 ? h("span", { class: "ldpp-sv-nav" }, IconButton(ChevronLeftIcon(14), { title: "较新", onClick: () => {
        index = Math.max(0, index - 1);
        render();
      } }), h("span", { class: "ldpp-sv-count" }, `${index + 1} / ${list.length}`), IconButton(ChevronRightIcon(14), { title: "较旧", onClick: () => {
        index = Math.min(list.length - 1, index + 1);
        render();
      } })) : null);
      body.replaceChildren();
      if (status) {
        append(body, h("div", { class: "ldpp-sv-loading" }, h("span", { class: "ldpp-spinner" }), h("span", null, status)), record ? h("div", { class: "ldpp-sv-stale" }, "（下方为上一次的总结）") : null);
      } else if (error) {
        const details = describeError(error);
        append(body, h("div", { class: "ldpp-error-box" }, h("strong", null, `总结失败：${errorMessage(error)}`), h("details", null, h("summary", null, "完整报错"), h("pre", { class: "ldpp-pre" }, details)), h("div", { class: "ldpp-row-actions" }, Button("重试", { small: true, kind: "primary", onClick: () => void summarizeTopic(topicId, { force: true }) }), Button("复制报错", { small: true, onClick: (event) => void copyWithFeedback(event.currentTarget, details) }))));
      }
      if (record) {
        append(body, trackScrollbar(h("div", { class: "ldpp-content ldpp-sv-content", innerHTML: renderContent(record.summary, record.renderMode) })), inlineMeta ? null : h("p", { class: "ldpp-sv-meta" }, meta));
      } else if (!status && !error) {
        append(body, h("div", { class: "ldpp-sv-empty" }, h("p", null, Summarized.has(topicId) && hasRemoteSource() ? "本地还没有这个话题的总结，云端可能有记录。" : "还没有总结。"), Summarized.has(topicId) && hasRemoteSource() ? Button(pulling ? "拉取中…" : "从云端拉取", {
          small: true,
          icon: CloudIcon(14),
          disabled: pulling,
          onClick: async () => {
            pulling = true;
            render();
            const ok = await pullRemote(topicId).catch(() => false);
            pulling = false;
            render();
            if (!ok)
              showToast("云端没有找到这个话题的总结", "warning", { topicId });
          }
        }) : null));
      }
    };
    const onChange = (changed) => {
      if (changed !== topicId)
        return;
      if (!el.isConnected) {
        if (seenConnected)
          view.destroy();
        return;
      }
      seenConnected = true;
      render();
    };
    const unsubs = [
      onSummaryState(onChange),
      subscribe("dataChange", ({ store, ids }) => {
        if ((store === "summaries" || store === "summarized") && ids.includes(topicId))
          onChange(topicId);
      }),
      subscribe("summaryUpdated", ({ topicId: id }) => {
        if (id !== topicId)
          return;
        index = 0;
        onChange(id);
      })
    ];
    const view = {
      el,
      toolbar,
      destroy() {
        for (const unsub of unsubs.splice(0))
          unsub();
      }
    };
    render();
    return view;
  }

  // src/plugins/topicSummary/sidebar.ts
  var root2 = null;
  var topicId = null;
  var open = false;
  var tab2 = "summary";
  var content = null;
  var options2 = { position: "right", autoOpen: false };
  var layoutWatch = null;
  function panelWidth(position, sidebar) {
    return Math.max(0, Math.round(position === "left" ? sidebar.left + sidebar.width : sidebar.width));
  }
  function nativeSidebar() {
    if (!document.body?.classList.contains("has-sidebar-page") || document.body.classList.contains("mobile-view"))
      return null;
    const el = document.querySelector("#main-outlet-wrapper > .sidebar-wrapper");
    return el && el.offsetWidth > 0 ? el : null;
  }
  function cssLength(value, fontSize, rootFontSize) {
    const match = value.trim().match(/^(-?[\d.]+)(px|em|rem)?$/);
    if (!match)
      return null;
    const amount = Number.parseFloat(match[1]);
    return match[2] === "em" ? amount * fontSize : match[2] === "rem" ? amount * rootFontSize : amount;
  }
  function nativeSidebarBox() {
    const el = nativeSidebar();
    if (el) {
      const rect = el.getBoundingClientRect();
      return { left: rect.left, width: rect.width };
    }
    const wrapper = document.querySelector("#main-outlet-wrapper");
    if (!wrapper)
      return { left: 0, width: DEFAULT_WIDTH };
    const style = getComputedStyle(wrapper);
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const width = cssLength(style.getPropertyValue("--d-sidebar-width"), Number.parseFloat(style.fontSize) || rootFontSize, rootFontSize);
    return { left: wrapper.getBoundingClientRect().left + (Number.parseFloat(style.paddingLeft) || 0), width: width ?? DEFAULT_WIDTH };
  }
  function applyLayout() {
    if (!root2)
      return;
    root2.className = classes("ldpp-sidebar", `is-${options2.position}`, open && "is-open");
    root2.style.setProperty("--ldpp-sidebar-width", `${panelWidth(options2.position, nativeSidebarBox())}px`);
    const handle = root2.querySelector(".ldpp-sidebar-handle");
    handle?.setAttribute("aria-expanded", String(open));
    if (layoutWatch) {
      const target = document.querySelector("#main-outlet-wrapper > .sidebar-wrapper");
      if (target !== layoutWatch.watched) {
        layoutWatch.sizes.disconnect();
        if (target)
          layoutWatch.sizes.observe(target);
        layoutWatch.watched = target;
      }
    }
  }
  function watchLayout() {
    if (layoutWatch)
      return;
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(applyLayout);
    };
    const observer = new MutationObserver(onResize);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("resize", onResize);
    layoutWatch = { observer, sizes: new ResizeObserver(onResize), watched: null, onResize };
  }
  function unwatchLayout() {
    if (!layoutWatch)
      return;
    layoutWatch.observer.disconnect();
    layoutWatch.sizes.disconnect();
    window.removeEventListener("resize", layoutWatch.onResize);
    layoutWatch = null;
  }
  function renderBody() {
    if (!root2 || !topicId)
      return;
    content?.destroy();
    const qaEnabled = isPluginEnabled("TopicQA");
    if (!qaEnabled)
      tab2 = "summary";
    const id = topicId;
    content = tab2 === "question" ? createQAPanel(id) : createSummaryView(id, { variant: "sidebar", onAsk: qaEnabled ? () => select("question") : undefined });
    const tabButton = (which, label) => h("button", { type: "button", class: classes("ldpp-sidebar-tab", tab2 === which && "is-active"), attrs: { role: "tab", "aria-selected": String(tab2 === which) }, on: { click: () => select(which) } }, label);
    root2.querySelector(".ldpp-sidebar-tabs")?.replaceChildren(tabButton("summary", "总结"), ...qaEnabled ? [tabButton("question", "提问")] : []);
    root2.querySelector(".ldpp-sidebar-body")?.replaceChildren(content.el);
    const gear = root2.querySelector(".ldpp-sidebar-settings");
    if (gear) {
      gear.title = tab2 === "question" ? "提问设置" : "总结设置";
      gear.setAttribute("aria-label", gear.title);
    }
    if (tab2 === "question")
      content.focus();
  }
  function select(next) {
    tab2 = next;
    renderBody();
  }
  function setSidebarOpen(next) {
    open = next;
    applyLayout();
  }
  function toggleSidebar() {
    if (root2)
      setSidebarOpen(!open);
  }
  function build() {
    const panel = h("section", { class: "ldpp-sidebar-panel", attrs: { "aria-label": "LD++ 话题助手" } }, h("header", { class: "ldpp-sidebar-header" }, h("div", { class: "ldpp-sidebar-tabs", attrs: { role: "tablist" } }), IconButton(SettingsIcon(16), { title: "总结设置", className: "ldpp-sidebar-settings", onClick: () => dispatch("openSettings", { tab: "features", plugin: tab2 === "question" ? "TopicQA" : "TopicSummary" }) })), h("div", { class: "ldpp-sidebar-body" }));
    const handle = h("button", {
      type: "button",
      class: "ldpp-sidebar-handle",
      title: "展开/收起 侧边栏（Alt+S）",
      attrs: { "aria-label": "展开/收起 话题助手", "aria-expanded": "false" },
      on: { click: toggleSidebar }
    });
    return mark(h("aside", { class: "ldpp-sidebar" }, panel, handle), "sidebar");
  }
  function syncSidebar(next, focus) {
    options2 = next;
    const route = currentRoute();
    if (route.kind !== "topic" || !route.topicId) {
      unmountSidebar();
      return;
    }
    const changed = route.topicId !== topicId;
    if (!root2) {
      root2 = build();
      document.body.appendChild(root2);
      open = options2.autoOpen;
      watchLayout();
    }
    if (focus) {
      tab2 = focus;
      open = true;
    }
    if (changed || focus) {
      topicId = route.topicId;
      if (changed && !focus)
        tab2 = "summary";
      renderBody();
    }
    setSidebarOpen(open);
  }
  function sidebarTopic() {
    return root2 ? topicId : null;
  }
  function unmountSidebar() {
    unwatchLayout();
    content?.destroy();
    content = null;
    root2?.remove();
    root2 = null;
    topicId = null;
  }

  // src/plugins/topicSummary/index.ts
  var settings10 = definePluginSettings({
    prompts: {
      type: 6 /* CUSTOM */,
      default: DEFAULT_PROMPTS
    },
    activePrompt: {
      type: 6 /* CUSTOM */,
      default: DEFAULT_PROMPTS[0].id
    },
    promptEditor: {
      type: 5 /* COMPONENT */,
      description: "提示词",
      render: () => renderPromptEditor({
        list: () => normalizePrompts(settings10.store.prompts),
        save: (next) => {
          settings10.store.prompts = next;
        },
        activeId: () => settings10.store.activePrompt,
        setActive: (id) => {
          settings10.store.activePrompt = id;
        }
      })
    },
    autoSummarize: {
      type: 2 /* BOOLEAN */,
      description: "打开没有总结的话题时自动生成总结（离开话题会自动取消）。",
      default: false
    },
    maxPosts: {
      type: 1 /* NUMBER */,
      description: "每次最多读取的楼层数（0 表示不限制）。超长话题建议设上限以控制费用。",
      min: 0,
      max: 1e4,
      default: 1000
    },
    stripFences: {
      type: 2 /* BOOLEAN */,
      description: "去掉 AI 回答首尾多余的代码块标记（如 ```html）。",
      default: true
    },
    fencePrefixes: {
      type: 0 /* STRING */,
      description: "需要去掉的开头标记（每行一个）",
      group: "代码块标记",
      tab: "开头",
      multiline: true,
      default: "```html\n```markdown\n```md\n```"
    },
    fenceSuffixes: {
      type: 0 /* STRING */,
      description: "需要去掉的结尾标记（每行一个）",
      group: "代码块标记",
      tab: "结尾",
      multiline: true,
      default: "```"
    },
    sidebarPosition: {
      type: 3 /* SELECT */,
      description: "侧栏位置",
      options: [
        { label: "右侧", value: "right", default: true },
        { label: "左侧", value: "left" }
      ]
    },
    autoOpen: {
      type: 2 /* BOOLEAN */,
      description: "进入话题页时自动展开侧栏。",
      default: false
    },
    hotkey: {
      type: 2 /* BOOLEAN */,
      description: "使用 Alt + S 展开 / 收起侧栏。",
      default: true
    }
  });
  var lines = (value) => value.split(`
`).map((line) => line.trim()).filter(Boolean);
  function activePrompt() {
    const prompts = normalizePrompts(settings10.store.prompts);
    return prompts.find((prompt) => prompt.id === settings10.store.activePrompt) ?? prompts[0];
  }
  function sidebarOptions() {
    return {
      position: settings10.store.sidebarPosition === "left" ? "left" : "right",
      autoOpen: settings10.store.autoOpen
    };
  }
  var startupTimer;
  function maybeAutoSummarize() {
    const { kind, topicId } = currentRoute();
    if (kind !== "topic" || !topicId || !settings10.store.autoSummarize || hasSummary(topicId))
      return;
    summarizeTopic(topicId, { mode: "auto" });
  }
  function onKeydown2(event) {
    if (!settings10.store.hotkey || !event.altKey || event.ctrlKey || event.metaKey || event.code !== "KeyS")
      return;
    if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable='true']"))
      return;
    event.preventDefault();
    toggleSidebar();
  }
  var topicSummary_default = definePlugin({
    name: "TopicSummary",
    displayName: "话题 AI 总结",
    description: "在话题页侧栏一键总结全部楼层（可含图片），保留历史记录；支持自定义提示词、自动总结、失败重试与限流退避。",
    tags: ["ai", "reading"],
    icon: SparkIcon,
    enabledByDefault: true,
    settings: settings10,
    start() {
      configureEngine({
        prompt: activePrompt,
        maxPosts: () => settings10.store.maxPosts,
        filter: () => ({ enabled: settings10.store.stripFences, prefixes: lines(settings10.store.fencePrefixes), suffixes: lines(settings10.store.fenceSuffixes) })
      });
      syncSidebar(sidebarOptions());
      startupTimer = setTimeout(maybeAutoSummarize, 0);
      document.addEventListener("keydown", onKeydown2, true);
    },
    stop() {
      clearTimeout(startupTimer);
      unmountSidebar();
      document.removeEventListener("keydown", onKeydown2, true);
    },
    onSettingsChange() {
      syncSidebar(sidebarOptions());
    },
    events: {
      navigate() {
        syncSidebar(sidebarOptions());
        maybeAutoSummarize();
      },
      focusTopic(event) {
        if (event.handled || event.view === "locate" || sidebarTopic() !== event.topicId)
          return;
        event.handled = true;
        syncSidebar(sidebarOptions(), event.view);
        setSidebarOpen(true);
      },
      pluginToggle({ name }) {
        if (name === "TopicQA" && sidebarTopic()) {
          unmountSidebar();
          syncSidebar(sidebarOptions());
        }
      }
    }
  });

  // src/plugins/disableAutoplay/index.ts
  var PLAYERS = "iframe[src*='player.bilibili.com'], iframe[src*='youtube.com/embed'], iframe[src*='youtube-nocookie.com/embed']";
  var EMBEDS = `.cooked :is(${PLAYERS}), .cooked video[autoplay]`;
  var GESTURE_MS = 3000;
  function withoutAutoplay(src, base = location.href) {
    let url;
    try {
      url = new URL(src, base);
    } catch {
      return null;
    }
    const value = url.searchParams.get("autoplay");
    if (value === "0" || value === "false")
      return null;
    url.searchParams.set("autoplay", "0");
    return src.startsWith("//") ? url.href.slice(url.protocol.length) : url.href;
  }
  var gesture = null;
  function onGesture(event) {
    const target = event.target instanceof Element ? event.target : null;
    gesture = { post: target?.closest(".cooked") ?? null, time: Date.now() };
  }
  function startedByUser(el) {
    return Boolean(gesture?.post?.isConnected && gesture.post.contains(el) && Date.now() - gesture.time < GESTURE_MS);
  }
  function quiet(el) {
    if (startedByUser(el))
      return;
    if (el instanceof HTMLVideoElement) {
      el.autoplay = false;
      if (!el.paused)
        el.pause();
      return;
    }
    const src = el.getAttribute("src");
    const next = src ? withoutAutoplay(src) : null;
    if (next)
      el.setAttribute("src", next);
  }
  function scan(node) {
    if (!(node instanceof Element) || node.closest(`[${LDPP_ATTR}]`))
      return;
    if (node.matches(EMBEDS))
      quiet(node);
    for (const embed of node.querySelectorAll(EMBEDS))
      quiet(embed);
  }
  var observer3 = null;
  var listeners4 = null;
  var disableAutoplay_default = definePlugin({
    name: "DisableAutoplay",
    displayName: "禁用视频自动播放",
    description: "帖子里嵌入的 B 站、YouTube 播放器不再自动播放；点击加载的视频照常播放（来自 linuxdo-scripts）。",
    tags: ["reading"],
    icon: VideoOffIcon,
    enabledByDefault: true,
    start() {
      listeners4 = new AbortController;
      for (const type of ["pointerdown", "keydown"])
        window.addEventListener(type, onGesture, { capture: true, signal: listeners4.signal });
      observer3 = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "attributes")
            scan(mutation.target);
          else
            for (const node of mutation.addedNodes)
              scan(node);
        }
      });
      observer3.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "autoplay"] });
      scan(document.documentElement);
    },
    stop() {
      observer3?.disconnect();
      observer3 = null;
      listeners4?.abort();
      listeners4 = null;
      gesture = null;
    }
  });

  // ldpp-css:src/plugins/listSummary/styles.css
  registerStyle("listSummary", `.ldpp-row-btn.ldpp-sum-btn {
    padding: 0 0.55rem;
    border: var(--d-button-default-border, var(--d-button-border, 1px solid transparent));
    background: var(--d-button-default-bg-color, var(--primary-low, #e9e9e9));
    color: var(--d-button-default-text-color, var(--primary, #222));
}

.ldpp-row-btn.ldpp-sum-btn .ldpp-icon {
    color: var(--d-button-default-icon-color, var(--primary-high, #4d4d4d));
}

@media (hover: hover) {
    .ldpp-row-btn.ldpp-sum-btn:hover {
        border: var(--d-button-default-border--hover, var(--d-button-default-border, 1px solid transparent));
        background: var(--d-button-default-bg-color--hover, var(--primary-medium, #888));
        color: var(--d-button-default-text-color--hover, var(--secondary, #fff));
    }

    .ldpp-row-btn.ldpp-sum-btn:hover .ldpp-icon {
        color: var(--d-button-default-icon-color--hover, var(--primary-low, #e9e9e9));
    }
}

.ldpp-row-btn.ldpp-sum-btn:active:not(:disabled) {
    background-color: var(--d-button-default-bg-color--hover, var(--primary-medium, #888));
    background-image: var(--ldpp-press);
    color: var(--d-button-default-text-color--hover, var(--secondary, #fff));
}

.ldpp-row-btn.ldpp-sum-btn.is-active {
    background: var(--d-selected, var(--tertiary-low, #d1f0ff));
    color: var(--d-selected-text-color, var(--primary, #222));
}

.ldpp-row-btn.ldpp-sum-btn.is-active .ldpp-icon {
    color: var(--tertiary, var(--ldpp-accent));
}

.ldpp-sum-btn .ldpp-spinner {
    width: 0.75rem;
    height: 0.75rem;
}

.ldpp-lsum {
    --ldpp-lines: 14;
    --ldpp-panel-width: 100%;

    box-sizing: border-box;
    width: var(--ldpp-panel-width);
    max-width: 100%;
    margin-top: 0.25rem;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--ldpp-line);
    border-radius: var(--ldpp-radius);
    background: var(--ldpp-bg);
}

.ldpp-lsum-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
}

.ldpp-lsum-title {
    flex: none;
    color: var(--ldpp-muted);
    font-size: var(--ldpp-font-sm);
    font-weight: 600;
}

/* 重新总结 / 复制 / 提问, then the time and model, on the title row; in a narrow panel the time is cut short first. */
.ldpp-lsum-head > .ldpp-sv-toolbar {
    flex: 1 1 auto;
    flex-wrap: nowrap;
    gap: 0.15rem;
    min-width: 0;
}

.ldpp-lsum-head .ldpp-sv-meta {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ldpp-lsum-head .ldpp-icon-btn {
    width: 1.6rem;
    height: 1.6rem;
}

/*
 * The scroll area reaches the panel's right border, so the scrollbar sits at the edge, not a padding's width inside it.
 * Its text ends where the title row does; a classic scrollbar takes its width out of that padding, down to 0.5rem.
 */
.ldpp-lsum .ldpp-sv-content,
.ldpp-lsum .ldpp-qa-thread {
    max-height: calc(1.65em * var(--ldpp-lines));
    margin-right: -0.8rem;
    padding-right: max(0.5rem, calc(0.8rem - var(--ldpp-scrollbar, 0px)));
    overflow: auto;
    overscroll-behavior: contain;
}
`);

  // src/plugins/listSummary/index.ts
  var settings11 = definePluginSettings({
    singleExpand: {
      type: 2 /* BOOLEAN */,
      description: "只展开一个总结面板（打开新的会收起其他）。",
      default: true
    },
    maxLines: {
      type: 4 /* SLIDER */,
      description: "面板内容最多显示的行数，超出后在面板内滚动。",
      min: 4,
      max: 40,
      default: 14
    },
    widthPercent: {
      type: 4 /* SLIDER */,
      description: "面板宽度（相对话题列宽度）。",
      min: 40,
      max: 100,
      step: 5,
      unit: "%",
      default: 100
    },
    autoSummarizeOnOpen: {
      type: 2 /* BOOLEAN */,
      description: "展开还没有总结的话题时立即开始总结。",
      default: true
    }
  });
  var open2 = new Map;
  var unsubs = [];
  function summaryLabel(topicId) {
    if (operationStatus(topicId))
      return { text: "总结中", icon: h("span", { class: "ldpp-spinner" }), state: "busy" };
    if (hasSummary(topicId))
      return { text: "已总结", icon: SparkIcon(14), state: "done" };
    if (Summarized.has(topicId) && hasRemoteSource())
      return { text: "云端", icon: CloudIcon(14), state: "remote" };
    return { text: "总结", icon: SparkIcon(14), state: "none" };
  }
  function renderSummaryButton(row, slot) {
    const label = summaryLabel(row.id);
    const active = open2.get(row.id)?.view === "summary";
    const signature = `${label.state}|${active}`;
    const existing = slot.firstElementChild;
    if (existing?.dataset.signature === signature)
      return;
    const button = h("button", {
      type: "button",
      class: classes("ldpp-row-btn ldpp-sum-btn", `is-${label.state}`, active && "is-active"),
      title: label.state === "done" ? "查看总结" : label.state === "busy" ? "正在总结，点击查看进度" : "AI 总结这个话题",
      dataset: { signature },
      attrs: { "aria-pressed": String(active) },
      on: { click: (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(row, "summary");
      } }
    }, label.icon, h("span", null, label.text));
    slot.replaceChildren(button);
  }
  function renderQuestionButton(row, slot) {
    if (!isPluginEnabled("TopicQA")) {
      slot.replaceChildren();
      return;
    }
    const active = open2.get(row.id)?.view === "question";
    const existing = slot.firstElementChild;
    if (existing && existing.classList.contains("is-active") === active)
      return;
    slot.replaceChildren(IconButton(QuestionIcon(15), {
      title: "提问 / 追问",
      className: classes("ldpp-row-btn", !active && "ldpp-hover-only", active && "is-active"),
      pressed: active,
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(row, "question");
      }
    }));
  }
  function refreshButtons(topicId) {
    for (const row of rowsForTopic(topicId)) {
      const summarySlot = row.el.querySelector(".ldpp-actions > [data-slot='list-summary']");
      const questionSlot = row.el.querySelector(".ldpp-actions > [data-slot='list-question']");
      if (summarySlot)
        renderSummaryButton(row, summarySlot);
      if (questionSlot)
        renderQuestionButton(row, questionSlot);
    }
  }
  function close(topicId) {
    const panel = open2.get(topicId);
    panel?.content?.destroy();
    open2.delete(topicId);
    removePanelRow(topicId);
    refreshButtons(topicId);
  }
  function mount2(topicId, panel, row) {
    const host = getPanelRow(row, true);
    if (!host)
      return;
    if (panel.host === host && panel.content?.el.isConnected)
      return;
    panel.content?.destroy();
    panel.host = host;
    const qaEnabled = isPluginEnabled("TopicQA");
    if (panel.view === "question" && !qaEnabled)
      panel.view = "summary";
    panel.content = panel.view === "question" ? createQAPanel(topicId, { variant: "list" }) : createSummaryView(topicId, { variant: "list", onAsk: qaEnabled ? () => switchView(row, "question") : undefined });
    host.replaceChildren(h("div", {
      class: "ldpp-lsum",
      style: { "--ldpp-lines": String(settings11.store.maxLines), "--ldpp-panel-width": `${settings11.store.widthPercent}%` }
    }, h("div", { class: "ldpp-lsum-head" }, h("span", { class: "ldpp-lsum-title" }, panel.view === "question" ? "提问 / 追问" : "AI 总结"), panel.view === "summary" ? panel.content.toolbar : null, IconButton(CloseIcon(14), { title: "收起", onClick: () => close(topicId) })), panel.content.el));
    if (panel.view === "question")
      panel.content.focus();
  }
  function switchView(row, view) {
    const panel = open2.get(row.id);
    if (!panel)
      return;
    panel.view = view;
    panel.host = null;
    mount2(row.id, panel, row);
    refreshButtons(row.id);
  }
  function openPanel2(row, view) {
    if (settings11.store.singleExpand) {
      for (const id of Array.from(open2.keys()))
        if (id !== row.id)
          close(id);
    }
    const existing = open2.get(row.id);
    if (existing) {
      if (existing.view !== view)
        switchView(row, view);
      return;
    }
    const panel = { view, content: null, host: null };
    open2.set(row.id, panel);
    mount2(row.id, panel, row);
    refreshButtons(row.id);
    if (view === "summary" && settings11.store.autoSummarizeOnOpen && !hasSummary(row.id) && !operationStatus(row.id))
      summarizeTopic(row.id);
  }
  function toggle(row, view) {
    if (open2.get(row.id)?.view === view)
      close(row.id);
    else
      openPanel2(row, view);
  }
  function keepPanels(rows) {
    for (const [topicId, panel] of open2) {
      const row = rows.find((item) => item.id === topicId && item.el.isConnected);
      if (!row) {
        panel.content?.destroy();
        open2.delete(topicId);
        continue;
      }
      mount2(topicId, panel, row);
    }
  }
  var listSummary_default = definePlugin({
    name: "ListSummary",
    displayName: "列表 AI 总结",
    description: "在话题列表的每一行加入「总结」与「提问」按钮，直接在行下方展开总结、历史与问答，不用逐个打开话题。",
    tags: ["ai", "topics"],
    icon: ListIcon,
    enabledByDefault: true,
    dependencies: ["TopicSummary"],
    settings: settings11,
    start() {
      registerDecorator({ id: "list-question", order: 30, render: renderQuestionButton });
      registerDecorator({ id: "list-summary", order: 40, render: renderSummaryButton });
      registerProcessor({ id: "list-summary-panels", run: keepPanels });
      unsubs.push(onSummaryState(refreshButtons), subscribe("dataChange", ({ store, ids }) => {
        if (store === "summaries" || store === "summarized")
          for (const id of ids)
            refreshButtons(id);
      }));
    },
    stop() {
      for (const unsub of unsubs.splice(0))
        unsub();
      for (const id of Array.from(open2.keys()))
        close(id);
      unregisterDecorator("list-question");
      unregisterDecorator("list-summary");
      unregisterProcessor("list-summary-panels");
    },
    onSettingsChange() {
      for (const [topicId, panel] of open2) {
        panel.host?.querySelector(".ldpp-lsum")?.style.setProperty("--ldpp-lines", String(settings11.store.maxLines));
        panel.host?.querySelector(".ldpp-lsum")?.style.setProperty("--ldpp-panel-width", `${settings11.store.widthPercent}%`);
        refreshButtons(topicId);
      }
    },
    events: {
      navigate() {
        for (const id of Array.from(open2.keys()))
          close(id);
      },
      focusTopic(event) {
        if (event.handled || event.view === "locate" || !settings2.store.clickExpands)
          return;
        const row = rowsForTopic(event.topicId).find((item) => !item.hidden);
        if (!row)
          return;
        event.handled = true;
        row.el.scrollIntoView({ block: "center", behavior: "smooth" });
        flashRow(row);
        openPanel2(row, event.view);
      },
      pluginToggle({ name }) {
        if (name !== "TopicQA")
          return;
        for (const id of Array.from(open2.keys()))
          close(id);
        schedule();
      }
    }
  });

  // ldpp-css:src/plugins/createdTime/styles.css
  registerStyle("createdTime", `/* The creation time sits in Discourse's own cell; while it is there the view count beside it is hidden, not removed
   (Ember keeps updating it). Colours are the original script's bands by age. */
.ldpp-created-time {
    font-weight: 400;
    white-space: nowrap;
}

.topic-list td.views:has(> .ldpp-created-time) > .number {
    display: none;
}

.topic-list td.views:has(> .ldpp-created-time),
.topic-list td.activity:has(> .ldpp-created-time) {
    white-space: nowrap;
}

.ldpp-created-time.is-day {
    color: #45b5aa;
}

.ldpp-created-time.is-week {
    color: #66a586;
}

.ldpp-created-time.is-month {
    color: #cfa94a;
}

.ldpp-created-time.is-quarter {
    color: #3e8ed2;
}

.ldpp-created-time.is-old {
    color: #ccc;
}

.ldpp-created-tomb {
    width: 1.5em;
    height: 1.5em;
    margin-right: 0.3em;
    vertical-align: bottom;
}
`);

  // src/plugins/createdTime/index.ts
  var TIME = "ldpp-created-time";
  var ACTIVITY_CELL = "td.activity[title], td.age[title]";
  var DAY2 = 24 * 60 * 60 * 1000;
  var HEADER_STYLE = "createdTime-header";
  var VIEWS_HEADER = ".topic-list th.views";
  var SORTED = "ldpp-created-sorted";
  var ASCENDING = "ldpp-created-ascending";
  var HEADER_CSS = `${VIEWS_HEADER} > button {
    font-size: 0 !important;
}
${VIEWS_HEADER} > button::before {
    content: "创建时间";
    font-size: var(--font-down-1-rem, 0.8706rem);
}
html.${SORTED} ${VIEWS_HEADER} > button::after {
    content: "";
    display: inline-block;
    width: 0.32rem;
    height: 0.32rem;
    margin-inline-start: 0.4rem;
    border-right: 0.12rem solid currentColor;
    border-bottom: 0.12rem solid currentColor;
    vertical-align: 0.22rem;
    transform: rotate(45deg);
}
html.${SORTED}.${ASCENDING} ${VIEWS_HEADER} > button::after {
    vertical-align: 0.05rem;
    transform: rotate(-135deg);
}`;
  var settings12 = definePluginSettings({
    position: {
      type: 3 /* SELECT */,
      description: "显示位置",
      options: [
        { label: "替换浏览量", value: "views", default: true },
        { label: "追加在活动时间后", value: "activity" }
      ]
    }
  });
  var position = () => settings12.store.position === "activity" ? "activity" : "views";
  var MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  function parseCreated(title) {
    const line = title.split(`
`)[0] ?? "";
    const text = line.replace(/^[^:：]*[:：]\s*/, "").trim();
    const zh = text.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*(\d{1,2}):(\d{2})/);
    if (zh)
      return new Date(+zh[1], +zh[2] - 1, +zh[3], +zh[4], +zh[5]).getTime();
    const en = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})\s*([ap]m)?/i);
    if (en) {
      let hours = +en[4] % 12;
      if (en[6]?.toLowerCase() === "pm")
        hours += 12;
      else if (!en[6])
        hours = +en[4];
      return new Date(+en[3], MONTHS[en[1].toLowerCase()], +en[2], hours, +en[5]).getTime();
    }
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? parsed : null;
  }
  var pad = (value) => String(value).padStart(2, "0");
  function formatCreated(time, now = Date.now()) {
    const date = new Date(time);
    const today = new Date(now);
    const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    if (date.toDateString() === today.toDateString())
      return clock;
    const day = `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
    return date.getFullYear() === today.getFullYear() ? `${day} ${clock}` : `${date.getFullYear()}/${day} ${clock}`;
  }
  function ageOf(time, now = Date.now()) {
    const age = now - time;
    if (age < DAY2)
      return "day";
    if (age < 7 * DAY2)
      return "week";
    if (age < 30 * DAY2)
      return "month";
    if (age < 90 * DAY2)
      return "quarter";
    return "old";
  }
  var tombstone = () => {
    const icon = svg("0 0 1024 1024", [["path", { fill: "#A51C30", d: "M916.992 813.44c11.008-44.032-9.856-53.632-9.856-53.632 7.168-23.552-12.8-46.592-12.8-46.592a72.448 72.448 0 0 0-12.032-34.816h-85.12V179.2a9.856 9.856 0 0 0-9.984-9.6h-54.144a9.856 9.856 0 0 1-9.472-7.168A204.8 204.8 0 0 0 524.8 14.208h-27.904a204.8 204.8 0 0 0-198.016 147.712 9.856 9.856 0 0 1-9.472 7.168h-51.968a10.496 10.496 0 0 0-10.752 10.368v499.2h-84.992v1.28a78.336 78.336 0 0 0-9.088 32.256s-22.656 23.296-15.36 46.72c0 0-20.736 9.856-9.344 53.504 0 0-66.176 11.776-49.408 193.536h83.072v0.768h740.608l86.528-0.896c14.72-181.376-51.712-192.384-51.712-192.384z" }]], 22);
    icon.classList.add("ldpp-created-tomb");
    return icon;
  };
  function fullDate(time) {
    const date = new Date(time);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  function show(row, where, now) {
    const activity = row.el.querySelector(ACTIVITY_CELL);
    const views = row.el.querySelector("td.views");
    const time = activity ? parseCreated(activity.getAttribute("title") ?? "") : null;
    const host = (where === "views" ? views : null) ?? activity;
    for (const old of row.el.querySelectorAll(`.${TIME}`))
      if (old.parentElement !== host || time === null)
        old.remove();
    if (!host || time === null)
      return;
    const inViews = host === views;
    const age = ageOf(time, now);
    const text = inViews ? formatCreated(time, now) : `（${formatCreated(time, now)}）`;
    const count = inViews ? views?.querySelector(".number")?.getAttribute("title") : null;
    const tip = count ? `创建于 ${fullDate(time)}
${count}` : `创建于 ${fullDate(time)}`;
    const key = `${text}|${age}|${tip}`;
    let span = host.querySelector(`:scope > .${TIME}`);
    if (span?.dataset.key === key)
      return;
    span ??= mark(h("span", { class: TIME }), "created-time");
    span.className = `${TIME} is-${age}`;
    span.dataset.key = key;
    span.title = tip;
    span.replaceChildren(...age === "old" ? [tombstone(), text] : [text]);
    if (span.parentElement !== host)
      host.append(span);
  }
  function createdSortUrl(href) {
    const url = new URL(href);
    const ascending = url.searchParams.get("order") === "created" && url.searchParams.get("ascending") !== "true";
    url.searchParams.set("ascending", String(ascending));
    url.searchParams.set("order", "created");
    return url.pathname + url.search + url.hash;
  }
  function syncSortState() {
    const params = new URLSearchParams(location.search);
    const sorted = active2 && position() === "views" && params.get("order") === "created";
    document.documentElement.classList.toggle(SORTED, sorted);
    document.documentElement.classList.toggle(ASCENDING, sorted && params.get("ascending") === "true");
  }
  function onHeaderClick(event) {
    if (position() !== "views" || !(event.target instanceof Element) || !event.target.closest(VIEWS_HEADER))
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    routeTo(createdSortUrl(location.href));
  }
  function labelHeaders() {
    for (const button of document.querySelectorAll(`${VIEWS_HEADER} > button`)) {
      if (position() === "views") {
        button.title = "按创建时间排序";
        button.setAttribute("aria-label", "创建时间");
      } else if (button.title === "按创建时间排序") {
        button.removeAttribute("title");
        button.removeAttribute("aria-label");
      }
    }
  }
  function applyHeader() {
    if (active2 && position() === "views")
      registerStyle(HEADER_STYLE, HEADER_CSS);
    else
      unregisterStyle(HEADER_STYLE);
    labelHeaders();
    syncSortState();
  }
  function showCreatedTimes(rows) {
    const where = position();
    const now = Date.now();
    for (const row of rows)
      show(row, where, now);
    if (active2) {
      labelHeaders();
      syncSortState();
    }
  }
  var timer;
  var active2 = false;
  var listeners5 = null;
  var createdTime_default = definePlugin({
    name: "CreatedTime",
    displayName: "话题列表显示创建时间",
    description: "在话题列表里显示每个话题的创建时间，可替换浏览量或追加在活动时间后，按新旧着色，三个月以上的话题带墓碑标记（来自 linuxdo-scripts）。",
    tags: ["topics"],
    icon: ClockIcon,
    enabledByDefault: true,
    settings: settings12,
    start() {
      active2 = true;
      listeners5 = new AbortController;
      window.addEventListener("click", onHeaderClick, { capture: true, signal: listeners5.signal });
      applyHeader();
      registerProcessor({ id: "created-time", run: showCreatedTimes });
      timer = setInterval(() => {
        if (document.visibilityState === "visible")
          showCreatedTimes(getRows());
      }, 60000);
    },
    stop() {
      active2 = false;
      listeners5?.abort();
      listeners5 = null;
      applyHeader();
      unregisterProcessor("created-time");
      clearInterval(timer);
      timer = undefined;
      for (const span of document.querySelectorAll(`.${TIME}`))
        span.remove();
    },
    onSettingsChange() {
      applyHeader();
      showCreatedTimes(getRows());
    },
    events: {
      navigate: syncSortState
    }
  });

  // ldpp-css:src/plugins/deArrow/styles.css
  registerStyle("deArrow", `tr.topic-list-item td.main-link:has(.ldpp-slot[data-slot="dearrow"] > .ldpp-dearrow-btn) {
    padding-inline-end: var(--ldpp-dearrow-lane);
}

tr.topic-list-item td.main-link:has(.ldpp-slot[data-slot="dearrow"] > .ldpp-dearrow-btn) .link-bottom-line {
    margin-inline-end: calc(4px - var(--ldpp-dearrow-lane));
}

.ldpp-actions > .ldpp-slot[data-slot="dearrow"] {
    position: absolute;
    right: 0;
    bottom: calc(100% + 2px);
}

.ldpp-dearrow-icon path {
    transition: fill 0.18s ease;
}

.ldpp-dearrow-btn.is-clickbait .ldpp-dearrow-icon path:nth-of-type(1) {
    fill: #c62828;
}

.ldpp-dearrow-btn.is-clickbait .ldpp-dearrow-icon path:nth-of-type(2) {
    fill: #fff;
}

.ldpp-dearrow-btn.is-clickbait .ldpp-dearrow-icon path:nth-of-type(3) {
    fill: #e53935;
}

.ldpp-dearrow-btn:is(.is-neutral, .is-error, :focus-visible) .ldpp-dearrow-icon path:nth-of-type(1) {
    fill: #6b6b6b;
}

.ldpp-dearrow-btn:is(.is-neutral, .is-error, :focus-visible) .ldpp-dearrow-icon path:nth-of-type(2) {
    fill: #bdbdbd;
}

.ldpp-dearrow-btn:is(.is-neutral, .is-error, :focus-visible) .ldpp-dearrow-icon path:nth-of-type(3) {
    fill: #8a8a8a;
}

@media (hover: hover) {
    .ldpp-dearrow-btn:hover .ldpp-dearrow-icon path:nth-of-type(1) {
        fill: #6b6b6b;
    }

    .ldpp-dearrow-btn:hover .ldpp-dearrow-icon path:nth-of-type(2) {
        fill: #bdbdbd;
    }

    .ldpp-dearrow-btn:hover .ldpp-dearrow-icon path:nth-of-type(3) {
        fill: #8a8a8a;
    }
}

.ldpp-dearrow-btn:is(.is-unjudged, .is-judging) .ldpp-dearrow-icon path:nth-of-type(1) {
    fill: var(--primary-low, #e9e9e9);
}

.ldpp-dearrow-btn:is(.is-unjudged, .is-judging) .ldpp-dearrow-icon path:nth-of-type(n + 2) {
    fill: none;
}

@media (hover: hover) {
    .ldpp-dearrow-btn:is(.is-unjudged, .is-judging):hover .ldpp-dearrow-icon path:nth-of-type(1) {
        fill: var(--primary-low-mid, #b3b3b3);
    }
}

.ldpp-dearrow-btn.is-judging .ldpp-dearrow-icon {
    animation: ldpp-skeleton-pulse 1.4s ease-in-out infinite;
}

.ldpp-dearrow-btn.is-judging {
    cursor: progress;
}

.ldpp-dearrow-btn.is-working .ldpp-dearrow-icon path:nth-of-type(1) {
    animation: ldpp-dearrow-outer 1.8s ease-in-out infinite alternate;
}

.ldpp-dearrow-btn.is-working .ldpp-dearrow-icon path:nth-of-type(2) {
    animation: ldpp-dearrow-middle 1.8s ease-in-out infinite alternate;
}

.ldpp-dearrow-btn.is-working .ldpp-dearrow-icon path:nth-of-type(3) {
    animation: ldpp-dearrow-center 1.8s ease-in-out infinite alternate;
}

.ldpp-row-btn.ldpp-dearrow-btn.is-working:disabled {
    opacity: 1;
    cursor: wait;
}

@keyframes ldpp-skeleton-pulse {
    50% {
        opacity: 0.45;
    }
}

@keyframes ldpp-dearrow-outer {
    from {
        fill: #6b6b6b;
    }

    to {
        fill: #1213bd;
    }
}

@keyframes ldpp-dearrow-middle {
    from {
        fill: #bdbdbd;
    }

    to {
        fill: #88c9f9;
    }
}

@keyframes ldpp-dearrow-center {
    from {
        fill: #8a8a8a;
    }

    to {
        fill: #0a62a5;
    }
}

@media (prefers-reduced-motion: reduce) {
    .ldpp-dearrow-icon path {
        transition: none;
    }

    .ldpp-dearrow-btn.is-working .ldpp-dearrow-icon path,
    .ldpp-dearrow-btn.is-judging .ldpp-dearrow-icon {
        animation: none;
    }
}

/* A rewritten title is underlined whole; one with typos fixed only under the corrected characters (below). */
.ldpp-title-overridden:not(.ldpp-title-edited) {
    text-decoration: underline dotted color-mix(in srgb, var(--ldpp-accent) 60%, transparent);
    text-underline-offset: 0.2em;
}

/* The corrected characters (a CSS highlight: no element is added to Discourse's title). */
::highlight(ldpp-title-fix) {
    text-decoration: underline dotted var(--ldpp-accent);
    text-decoration-thickness: 2px;
}

.ldpp-title-mark-clickbait:is(:not(.ldpp-title-overridden), .ldpp-title-edited) {
    text-decoration: underline dotted color-mix(in srgb, var(--danger, var(--ldpp-danger)) 75%, transparent);
    text-underline-offset: 0.2em;
}

.ldpp-title-mark-original:not(.ldpp-title-overridden) {
    text-decoration: underline dotted var(--primary-medium, #888);
    text-underline-offset: 0.2em;
}

`);

  // src/plugins/deArrow/claims.ts
  var TTL_MS = 5 * 60000;
  var CONFIRM_MS = 150;
  var tabId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  var keyFor = (kind, topicId) => `LDPP.dearrowClaim.${kind}.${topicId}`;
  function holder(kind, topicId) {
    const stored = gmGet(keyFor(kind, topicId), null);
    if (!isObject(stored) || typeof stored.tab !== "string" || typeof stored.until !== "number" || stored.until <= Date.now())
      return null;
    return stored.tab;
  }
  function heldElsewhere(kind, topicId) {
    const tab = holder(kind, topicId);
    return tab !== null && tab !== tabId;
  }
  async function claim(kind, topicId, confirmMs = CONFIRM_MS) {
    if (heldElsewhere(kind, topicId))
      return false;
    gmSet(keyFor(kind, topicId), { tab: tabId, until: Date.now() + TTL_MS });
    await sleep(confirmMs);
    return holder(kind, topicId) === tabId;
  }
  function release(kind, topicId) {
    if (holder(kind, topicId) === tabId)
      gmDelete(keyFor(kind, topicId));
  }

  // src/plugins/deArrow/protocol.ts
  var JUDGE_BATCH = 20;
  var MAX_TITLE_LENGTH = 120;
  var DEFAULT_JUDGE_PROMPT = [
    "你是论坛标题质量评审，只能依据标题本身判断，不要猜测正文。",
    "如果标题夸大其词、制造恐慌或紧迫感、故意隐去关键信息吊胃口（如「震惊」「万万没想到」「这件事」「速看」），判为标题党。",
    "普通的提问、求助、吐槽、幽默或简短标题本身不算标题党。",
    '只返回严格 JSON，不要任何解释：{"results":[{"topicId":"…","verdict":true,"reason":"不超过 20 字的原因"}]}。',
    "输入里的每个 topicId 必须且只能出现一次。"
  ].join(`
`);
  var DEFAULT_REWRITE_PROMPT = [
    "你负责根据论坛话题的首帖内容重写标题。",
    "新标题要具体、中立、不夸张，让读者一眼看出首帖实际在说什么；保留重要的技术名词、产品名、版本号和数字。",
    "不得加入首帖中没有的事实，长度尽量不超过 40 个字。",
    '只返回严格 JSON：{"title":"新标题"}，不要 Markdown、HTML 或解释。'
  ].join(`
`);
  function unfence(text) {
    const trimmed = text.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenced)
      return fenced[1].trim();
    const start = trimmed.search(/[[{]/);
    const end = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
    return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
  }
  function asBool(value) {
    if (typeof value === "boolean")
      return value;
    if (value === "true" || value === "是")
      return true;
    if (value === "false" || value === "否")
      return false;
    return null;
  }
  function buildJudgeMessages(prompt, topics) {
    return [
      { role: "system", content: prompt.trim() || DEFAULT_JUDGE_PROMPT },
      { role: "user", content: JSON.stringify(topics.slice(0, JUDGE_BATCH).map((topic) => ({ topicId: topic.topicId, title: topic.title }))) }
    ];
  }
  function parseJudge(text) {
    let parsed;
    try {
      parsed = JSON.parse(unfence(text));
    } catch (error) {
      throw new Error(`判断结果不是有效 JSON：${error.message}`, { cause: error });
    }
    const list = Array.isArray(parsed) ? parsed : isObject(parsed) ? parsed.results ?? parsed.topics : null;
    if (!Array.isArray(list))
      throw new Error("判断结果缺少 results 数组");
    const seen = new Set;
    const out = [];
    for (const item of list) {
      if (!isObject(item))
        continue;
      const topicId = asString(item.topicId ?? item.topic_id ?? item.id);
      const verdict = asBool(item.verdict ?? item.isClickbait ?? item.clickbait);
      if (!topicId || verdict === null || seen.has(topicId))
        continue;
      seen.add(topicId);
      out.push({ topicId, verdict, reason: asString(item.reason) });
    }
    return out;
  }
  function buildRewriteMessages(prompt, originalTitle, firstPost, imageCount) {
    const system = [prompt.trim() || DEFAULT_REWRITE_PROMPT, imageCount ? "用户消息附带了首帖中的图片，请结合图片内容与正文里的 [图片#N] 标记理解首帖。" : ""].filter(Boolean).join(`
`);
    return [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify({ originalTitle, firstPost, ...imageCount ? { attachedImageCount: imageCount } : {} }) }
    ];
  }
  function parseRewrite(text) {
    const raw = text.trim();
    let title = raw;
    if (/^(```|\{|")/.test(raw)) {
      try {
        const parsed = JSON.parse(unfence(raw));
        title = typeof parsed === "string" ? parsed : isObject(parsed) ? asString(parsed.title) : "";
      } catch (error) {
        throw new Error(`改写结果不是有效 JSON：${error.message}`, { cause: error });
      }
    }
    title = normalizeText(title);
    if (!title)
      throw new Error("改写结果为空");
    if (/<\/?[a-z][^>]*>/i.test(title))
      throw new Error("改写结果包含 HTML");
    if (title.length > MAX_TITLE_LENGTH)
      throw new Error(`改写结果过长（${title.length} 字）`);
    return title;
  }

  // src/plugins/deArrow/scope.ts
  var DEFAULT_SCOPE = ["https://linux.do/latest?order=created", "https://linux.do/top?ascending=false&order=views"];
  var WILDCARD = "__ldpp_wildcard__";
  function parseScopeLine(line) {
    const trimmed = line.trim().replace(/#.*$/, "");
    const url = new URL(trimmed.replaceAll("*", WILDCARD));
    if (url.protocol !== "https:" || url.hostname !== "linux.do" || url.port || url.username || url.password)
      throw new Error("只支持 https://linux.do 下的地址");
    url.hash = "";
    return url.href.replaceAll(WILDCARD, "*");
  }
  function checkScope(raw) {
    const lines = Array.isArray(raw) ? raw : raw.split(/\r?\n/);
    const rules = [];
    const errors = [];
    for (const [index, line] of lines.entries()) {
      if (!line.trim())
        continue;
      try {
        const rule = parseScopeLine(line);
        if (!rules.includes(rule))
          rules.push(rule);
      } catch (error) {
        errors.push(`第 ${index + 1} 行「${line.trim()}」无效：${error instanceof TypeError ? "不是完整的 URL" : error.message}`);
      }
    }
    if (!rules.length && !errors.length)
      errors.push("至少需要一条作用范围 URL");
    return { rules, errors };
  }
  function compileScope(rules) {
    return rules.map((rule) => new RegExp(`^${rule.split("*").map(escapeRegExp).join(".*")}$`));
  }
  function scopeMatches(compiled, href) {
    let url;
    try {
      url = new URL(href);
    } catch {
      return false;
    }
    url.hash = "";
    return compiled.some((regex) => regex.test(url.href));
  }

  // src/plugins/deArrow/typos.ts
  var FIX_BATCH = JUDGE_BATCH;
  var MAX_FIXES = 4;
  var MAX_FRAGMENT = 16;
  var MAX_CHANGE = 3;
  var DEFAULT_FIX_PROMPT = [
    "你是中文技术论坛的标题校对员，只找出确定写错的字词，用最少的改动修正。",
    "要修正的：同音或近音的别字（以经→已经、因该→应该、在接再厉→再接再厉）、形近字（按装→安装、迫不急待→迫不及待）、明显多打或漏打的字，以及英文单词拼错（recieve→receive、Calude→Claude）。",
    "不要修改：网络用语、梗和有意的谐音（如 佬、蚌埠住了、栓Q）；人名、昵称、型号、版本号、代码、链接和缩写；大小写、标点、空格和繁简体；「的地得」、语序、措辞和口语化的说法。拿不准就不改。",
    '只返回严格 JSON：{"results":[{"topicId":"…","fixes":[{"from":"标题里的原片段","to":"修正后的片段"}]}]}。',
    "from 必须与标题原文一字不差，带上错字前后的一两个字，使它在这个标题里只出现一次；to 只改其中写错的字。",
    '没有错别字的标题不要放进 results；全都没有错别字时返回 {"results":[]}。'
  ].join(`
`);
  function buildFixMessages(prompt, topics) {
    return [
      { role: "system", content: prompt.trim() || DEFAULT_FIX_PROMPT },
      { role: "user", content: JSON.stringify(topics.slice(0, FIX_BATCH).map((topic) => ({ topicId: topic.topicId, title: topic.title }))) }
    ];
  }
  function parseFixes(text) {
    let parsed;
    try {
      parsed = JSON.parse(unfence(text));
    } catch (error) {
      throw new Error(`错别字结果不是有效 JSON：${error.message}`, { cause: error });
    }
    const list = Array.isArray(parsed) ? parsed : isObject(parsed) ? parsed.results ?? parsed.topics : null;
    if (!Array.isArray(list))
      throw new Error("错别字结果缺少 results 数组");
    const out = new Map;
    for (const item of list) {
      if (!isObject(item))
        continue;
      const topicId = asString(item.topicId ?? item.topic_id ?? item.id);
      const fixes = item.fixes ?? item.corrections ?? item.edits;
      if (topicId && Array.isArray(fixes) && !out.has(topicId))
        out.set(topicId, fixes);
    }
    return out;
  }
  function changedPart(from, to) {
    const a = Array.from(from);
    const b = Array.from(to);
    let head = 0;
    while (head < a.length && head < b.length && a[head] === b[head])
      head++;
    let tail = 0;
    while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail])
      tail++;
    return {
      removed: a.slice(head, a.length - tail).join(""),
      inserted: b.slice(head, b.length - tail).join(""),
      start: b.slice(0, head).join("").length,
      end: to.length - b.slice(b.length - tail).join("").length
    };
  }
  function fixMark(fix) {
    const { start, end } = changedPart(fix.from, fix.to);
    return end > start ? [start, end] : [0, fix.to.length];
  }
  var squash = (value) => value.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
  var length = (value) => Array.from(value).length;
  function acceptFixes(title, raw) {
    if (!Array.isArray(raw) || !raw.length || raw.length > MAX_FIXES)
      return [];
    let budget = Math.max(MAX_CHANGE, Math.ceil(length(title) / 4));
    const taken = [];
    for (const item of raw) {
      if (!isObject(item))
        continue;
      const from = asString(item.from ?? item.wrong ?? item.original);
      const to = asString(item.to ?? item.right ?? item.corrected);
      if (!from || !to || from === to || /[\r\n\t]/.test(from + to))
        continue;
      if (length(from) > MAX_FRAGMENT || length(to) > MAX_FRAGMENT)
        continue;
      const at = title.indexOf(from);
      if (at < 0 || title.includes(from, at + 1))
        continue;
      if (taken.some((hit) => at < hit.at + hit.fix.from.length && hit.at < at + from.length))
        continue;
      if (squash(from) === squash(to))
        continue;
      const { removed, inserted } = changedPart(from, to);
      const cost = Math.max(length(removed), length(inserted));
      if (cost > MAX_CHANGE || cost > budget)
        continue;
      budget -= cost;
      taken.push({ at, fix: { from, to } });
    }
    return taken.toSorted((x, y) => x.at - y.at).map((hit) => hit.fix);
  }
  var describeFixes = (fixes) => fixes.map((fix) => `${fix.from}→${fix.to}`).join("、");

  // src/plugins/deArrow/index.ts
  var logger12 = new Logger("DeArrow", "#f5c2e7");
  var AUTO_CONCURRENCY = 2;
  var DRAIN_DELAY_MS = 300;
  var FIX_HIGHLIGHT = "ldpp-title-fix";
  var profileOptions = () => [{ label: "跟随默认 AI 配置", value: "" }, ...profileChoices()];
  var settings13 = definePluginSettings({
    autoRewrite: {
      type: 2 /* BOOLEAN */,
      description: "判定为标题党后自动读取首帖并改写标题（关闭时可点击 ✦ 按钮手动改写）。",
      default: false
    },
    fixTypos: {
      type: 2 /* BOOLEAN */,
      description: "修正错别字：在作用范围内用 AI 找出标题里写错的字并改正显示，改过的字带点状下划线；只改错字，不动措辞。",
      default: true
    },
    judgeProfile: {
      type: 3 /* SELECT */,
      description: "标题判断与错别字修正使用的 AI 配置（建议选便宜快速的模型）",
      options: profileOptions,
      default: ""
    },
    rewriteProfile: {
      type: 3 /* SELECT */,
      description: "标题改写使用的 AI 配置",
      options: profileOptions,
      default: ""
    },
    scope: {
      type: 0 /* STRING */,
      description: "自动判断与改写的作用范围（每行一个完整 URL，* 匹配任意字符，#hash 会被忽略）。范围外的列表仍显示按钮和已改写的标题，可手动改写。",
      group: "作用范围与提示词",
      tab: "作用范围",
      multiline: true,
      default: DEFAULT_SCOPE.join(`
`),
      isValid: (value) => {
        const result = checkScope(value);
        return result.errors.length ? result.errors.join("；") : true;
      }
    },
    judgePrompt: {
      type: 0 /* STRING */,
      description: "标题判断提示词（需保留严格 JSON 返回格式）",
      group: "作用范围与提示词",
      tab: "判断提示词",
      multiline: true,
      default: DEFAULT_JUDGE_PROMPT
    },
    rewritePrompt: {
      type: 0 /* STRING */,
      description: "标题改写提示词（需保留严格 JSON 返回格式）",
      group: "作用范围与提示词",
      tab: "改写提示词",
      multiline: true,
      default: DEFAULT_REWRITE_PROMPT
    },
    fixPrompt: {
      type: 0 /* STRING */,
      description: "错别字修正提示词（需保留严格 JSON 返回格式）",
      group: "作用范围与提示词",
      tab: "错别字提示词",
      multiline: true,
      default: DEFAULT_FIX_PROMPT
    }
  });
  var overridden = new Set;
  var marked2 = new Set;
  var judgeQueue = new Map;
  var judging = new Set;
  var judgeRuns = new Map;
  var rewriting = new Map;
  var errors2 = new Map;
  var autoQueue = [];
  var fixQueue = new Map;
  var fixing = new Set;
  var fixFailed = new Map;
  var unsubs2 = [];
  var scopeRegex = null;
  var autoActive = 0;
  var drainTimer = null;
  var draining = false;
  var fixTimer = null;
  var fixDraining = false;
  function inScope() {
    scopeRegex ??= compileScope(checkScope(settings13.store.scope).rules);
    return scopeMatches(scopeRegex, location.href);
  }
  function stateFor(topicId, title) {
    const state = DeArrowStates.get(topicId);
    return state?.originalTitle === title ? state : undefined;
  }
  function baseState(topicId, title) {
    return stateFor(topicId, title) ?? { originalTitle: title, updatedAt: "" };
  }
  function shownFixes(state) {
    return settings13.store.fixTypos && state && !state.rewrittenTitle ? state.fixes ?? [] : [];
  }
  function errorFor(topicId, title) {
    const error = errors2.get(topicId);
    return error?.title === title ? error : undefined;
  }
  function buttonView(row) {
    const state = stateFor(row.id, row.originalTitle);
    const phase = rewriting.get(row.id);
    const error = errorFor(row.id, row.originalTitle);
    if (phase)
      return { state: "working", title: phase, busy: true, preview: false };
    const fixes = shownFixes(state);
    const preview = Boolean(state?.rewrittenTitle) || fixes.length > 0;
    const note = fixes.length ? `
已修正错别字：${describeFixes(fixes)}（悬停时显示原标题）` : "";
    if (judging.has(row.id) || judgeQueue.has(row.id))
      return { state: "judging", title: `正在判断是否为标题党…${note}`, busy: false, preview };
    if (error)
      return { state: "error", title: `DeArrow ${error.kind === "judge" ? "判断" : "改写"}失败：${error.message}（点击重试）${note}`, busy: false, preview };
    if (state?.rewrittenTitle)
      return { state: "rewritten", title: `已改写。悬停查看原标题：${row.originalTitle}
点击重新改写`, busy: false, preview };
    if (state?.verdict === true)
      return { state: "clickbait", title: `疑似标题党：${state.verdictReason || "无理由"}（点击改写）${note}`, busy: false, preview };
    if (state?.verdict === false)
      return { state: "neutral", title: `${state.verdictReason || "未发现标题党特征"}（仍可点击改写）${note}`, busy: false, preview };
    return { state: "unjudged", title: `尚未判断（点击判断并改写）${note}`, busy: false, preview };
  }
  function renderButton2(row, slot) {
    const view = buttonView(row);
    const existing = slot.firstElementChild;
    const signature = `${view.state}|${view.title}`;
    if (existing?.dataset.signature === signature)
      return;
    const button = h("button", {
      type: "button",
      class: classes("ldpp-row-btn ldpp-dearrow-btn", `is-${view.state}`),
      title: view.title,
      disabled: view.busy,
      dataset: { signature },
      attrs: { "aria-label": view.title },
      on: {
        click: (event) => {
          event.preventDefault();
          event.stopPropagation();
          setTitlePreview(row.id, false);
          onButtonClick(row);
        },
        mouseenter: () => {
          if (view.preview)
            setTitlePreview(row.id, true);
        },
        mouseleave: () => setTitlePreview(row.id, false),
        focus: () => {
          if (view.preview)
            setTitlePreview(row.id, true);
        },
        blur: () => setTitlePreview(row.id, false)
      }
    }, DeArrowIcon(18));
    slot.replaceChildren(button);
  }
  function refreshButtons2(topicId) {
    for (const row of rowsForTopic(topicId)) {
      const slot = row.el.querySelector(".ldpp-actions > [data-slot='dearrow']");
      if (slot)
        renderButton2(row, slot);
    }
  }
  function onButtonClick(row) {
    const error = errorFor(row.id, row.originalTitle);
    errors2.delete(row.id);
    if (error?.kind === "judge" && !stateFor(row.id, row.originalTitle)?.rewrittenTitle) {
      judgeQueue.set(row.id, { topicId: row.id, title: row.originalTitle });
      refreshButtons2(row.id);
      scheduleDrain();
      return;
    }
    rewrite({ topicId: row.id, title: row.originalTitle }, false);
  }
  var batchFailures = new Map;
  function batchToast(key, what, batch, error) {
    batchFailures.set(key, batch);
    const message = `DeArrow ${what}${batch.length > 1 ? `（${batch.length} 个话题）` : ""}：${errorMessage(error)}`;
    showToast(message, "error", {
      topicId: batch.length === 1 ? batch[0].topicId : undefined,
      key,
      onClick: () => {
        locateBatch(batchFailures.get(key) ?? []);
        batchFailures.delete(key);
      },
      onDismiss: () => batchFailures.delete(key)
    });
  }
  function locateBatch(batch) {
    const rows = batch.flatMap((item) => rowsForTopic(item.topicId).filter((row) => !row.hidden));
    if (!rows.length) {
      if (batch.length)
        focusTopic(batch[0].topicId, "locate");
      return;
    }
    rows[0].el.scrollIntoView({ block: "center", behavior: "smooth" });
    for (const row of rows)
      flashRow(row);
  }
  function scheduleDrain() {
    if (drainTimer)
      return;
    drainTimer = setTimeout(() => {
      drainTimer = null;
      drainJudge();
    }, DRAIN_DELAY_MS);
  }
  async function judgeBatch(batch) {
    const profile = getProfile(String(settings13.store.judgeProfile ?? "") || undefined);
    const text = await chatWithRetry(profile, buildJudgeMessages(settings13.store.judgePrompt, batch));
    const results = new Map(parseJudge(text).map((result) => [result.topicId, result]));
    const now = new Date().toISOString();
    const updates = {};
    for (const input of batch) {
      const result = results.get(input.topicId);
      if (!result) {
        errors2.set(input.topicId, { kind: "judge", message: "模型没有返回这个话题的判断", title: input.title });
        continue;
      }
      const current = DeArrowStates.get(input.topicId);
      if (current && current.originalTitle !== input.title)
        continue;
      updates[input.topicId] = { ...baseState(input.topicId, input.title), verdict: result.verdict, verdictReason: result.reason, verdictModel: profile?.model ?? "", verdictUpdatedAt: now, updatedAt: now };
    }
    DeArrowStates.setMany(updates);
  }
  async function drainJudge() {
    if (draining)
      return;
    draining = true;
    try {
      while (judgeQueue.size && isPluginEnabled("DeArrow")) {
        const picked = Array.from(judgeQueue.values()).slice(0, JUDGE_BATCH);
        for (const item of picked) {
          judgeQueue.delete(item.topicId);
          judging.add(item.topicId);
          refreshButtons2(item.topicId);
        }
        const claimed = await Promise.all(picked.map((item) => claim("judge", item.topicId)));
        const batch = picked.filter((_, index) => claimed[index]);
        for (const item of picked) {
          if (batch.includes(item))
            continue;
          judging.delete(item.topicId);
          refreshButtons2(item.topicId);
        }
        if (!batch.length)
          continue;
        const run = judgeBatch(batch);
        for (const item of batch)
          judgeRuns.set(item.topicId, run);
        try {
          await run;
          closeToast("dearrow-judge");
        } catch (error) {
          logger12.warn("判断失败", error);
          for (const item of batch)
            errors2.set(item.topicId, { kind: "judge", message: errorMessage(error), title: item.title });
          if (!(error instanceof AIError && (error.code === "NO_KEY" || error.code === "NO_PROFILE")))
            batchToast("dearrow-judge", "判断失败", batch, error);
        } finally {
          DeArrowStates.flush();
          for (const item of batch) {
            judging.delete(item.topicId);
            judgeRuns.delete(item.topicId);
            release("judge", item.topicId);
            refreshButtons2(item.topicId);
          }
        }
      }
    } finally {
      draining = false;
      schedule();
    }
  }
  function scheduleFix() {
    if (fixTimer)
      return;
    fixTimer = setTimeout(() => {
      fixTimer = null;
      drainFix();
    }, DRAIN_DELAY_MS);
  }
  async function fixBatch(batch) {
    const profile = getProfile(String(settings13.store.judgeProfile ?? "") || undefined);
    const found = parseFixes(await chatWithRetry(profile, buildFixMessages(settings13.store.fixPrompt, batch)));
    const now = new Date().toISOString();
    const updates = {};
    for (const input of batch) {
      const current = DeArrowStates.get(input.topicId);
      if (current && current.originalTitle !== input.title)
        continue;
      const { fixes: _previous, ...rest } = baseState(input.topicId, input.title);
      const fixes = acceptFixes(input.title, found.get(input.topicId));
      updates[input.topicId] = { ...rest, ...fixes.length ? { fixes } : {}, fixModel: profile?.model ?? "", fixCheckedAt: now, updatedAt: now };
    }
    DeArrowStates.setMany(updates);
  }
  async function drainFix() {
    if (fixDraining)
      return;
    fixDraining = true;
    try {
      while (fixQueue.size && isPluginEnabled("DeArrow") && settings13.store.fixTypos) {
        const picked = Array.from(fixQueue.values()).slice(0, FIX_BATCH);
        for (const item of picked) {
          fixQueue.delete(item.topicId);
          fixing.add(item.topicId);
        }
        const claimed = await Promise.all(picked.map((item) => claim("fix", item.topicId)));
        const batch = picked.filter((_, index) => claimed[index]);
        for (const item of picked)
          if (!batch.includes(item))
            fixing.delete(item.topicId);
        if (!batch.length)
          continue;
        try {
          await fixBatch(batch);
          closeToast("dearrow-fix");
        } catch (error) {
          logger12.warn("错别字修正失败", error);
          for (const item of batch)
            fixFailed.set(item.topicId, item.title);
          if (!(error instanceof AIError && (error.code === "NO_KEY" || error.code === "NO_PROFILE")))
            batchToast("dearrow-fix", "错别字修正失败", batch, error);
        } finally {
          DeArrowStates.flush();
          for (const item of batch) {
            fixing.delete(item.topicId);
            release("fix", item.topicId);
          }
        }
      }
    } finally {
      fixDraining = false;
      schedule();
    }
  }
  async function rewrite(input, automatic) {
    const { topicId, title } = input;
    if (rewriting.has(topicId))
      return;
    const setPhase = (phase) => {
      rewriting.set(topicId, phase);
      refreshButtons2(topicId);
    };
    setPhase("正在判断…");
    let claimed = false;
    try {
      claimed = await claim("rewrite", topicId);
      if (!claimed) {
        if (!automatic)
          showToast("另一个标签页正在改写这个话题，结果会自动同步过来", "info", { topicId, key: `dearrow:${topicId}`, onClick: () => focusTopic(topicId, "locate") });
        return;
      }
      judgeQueue.delete(topicId);
      await judgeRuns.get(topicId)?.catch(() => {
        return;
      });
      if (typeof stateFor(topicId, title)?.verdict !== "boolean")
        await judgeBatch([input]);
      if (automatic && stateFor(topicId, title)?.verdict !== true)
        return;
      const profile = requireProfile(getProfile(String(settings13.store.rewriteProfile ?? "") || undefined));
      setPhase("正在读取首帖…");
      const content = await buildTopicContent(topicId, {
        firstPostOnly: true,
        retries: profile.retryCount,
        onRetry: (info) => setPhase(`linux.do 限流，${info.delaySeconds} 秒后重试…`)
      });
      const images = profile.imageInput && content.images.length ? (await prepareImages(content.images, profile)).prepared : [];
      const body = content.text.replace(/^#1 [^\n]*：\n?/, "").trim();
      if (!body.replace(/\[图片#\d+[^\]]*\]/g, "").trim() && !images.length) {
        throw new Error(profile.imageInput ? "首帖只有图片，且图片准备失败" : "首帖只有图片，请在改写所用的 AI 配置中开启图片输入");
      }
      setPhase("正在改写标题…");
      const messages = buildRewriteMessages(settings13.store.rewritePrompt, title, content.text, images.length);
      messages[1].content = userContent(messages[1].content, images);
      const rewritten = parseRewrite(await chatWithRetry(profile, messages));
      const current = DeArrowStates.get(topicId);
      if (current && current.originalTitle !== title)
        return;
      const now = new Date().toISOString();
      DeArrowStates.set(topicId, { ...baseState(topicId, title), rewrittenTitle: rewritten, rewriteModel: profile.model, rewrittenAt: now, updatedAt: now });
      closeToast(`dearrow:${topicId}`);
    } catch (error) {
      logger12.warn(`改写话题 ${topicId} 失败`, error);
      errors2.set(topicId, { kind: "rewrite", message: errorMessage(error), title });
      if (!automatic)
        showToast(`DeArrow 改写失败：${errorMessage(error)}`, "error", { topicId, key: `dearrow:${topicId}`, onClick: () => focusTopic(topicId, "locate") });
    } finally {
      if (claimed) {
        DeArrowStates.flush();
        release("rewrite", topicId);
      }
      rewriting.delete(topicId);
      refreshButtons2(topicId);
      schedule();
    }
  }
  function pumpAuto() {
    while (autoActive < AUTO_CONCURRENCY && autoQueue.length) {
      const next = autoQueue.shift();
      if (!next || rewriting.has(next.topicId))
        continue;
      autoActive++;
      rewrite(next, true).finally(() => {
        autoActive--;
        pumpAuto();
      });
    }
  }
  function clearOverrides() {
    for (const id of overridden)
      setTitleOverride(id, null);
    overridden.clear();
    for (const id of marked2)
      setTitleMark(id, null);
    marked2.clear();
  }
  function process2(rows) {
    const automatic = inScope();
    const seen = new Set;
    const now = new Date().toISOString();
    for (const row of rows) {
      if (seen.has(row.id) || !row.originalTitle)
        continue;
      seen.add(row.id);
      const stored = DeArrowStates.get(row.id);
      if (stored && stored.originalTitle !== row.originalTitle && !row.hidden) {
        DeArrowStates.set(row.id, { originalTitle: row.originalTitle, updatedAt: now });
        errors2.delete(row.id);
      }
      const state = stateFor(row.id, row.originalTitle);
      const fixes = shownFixes(state);
      if (state?.rewrittenTitle) {
        setTitleOverride(row.id, state.rewrittenTitle);
        overridden.add(row.id);
      } else if (fixes.length) {
        setTitleOverride(row.id, { edits: fixes.map((fix) => ({ ...fix, mark: fixMark(fix) })), highlight: FIX_HIGHLIGHT });
        overridden.add(row.id);
      } else if (overridden.delete(row.id)) {
        setTitleOverride(row.id, null);
      }
      const titleMark = state?.verdict === true ? "clickbait" : state?.rewrittenTitle || fixes.length ? "original" : null;
      if (titleMark) {
        setTitleMark(row.id, titleMark);
        marked2.add(row.id);
      } else if (marked2.delete(row.id)) {
        setTitleMark(row.id, null);
      }
      if (automatic && !row.hidden && settings13.store.fixTypos && !state?.rewrittenTitle && !state?.fixCheckedAt && !fixing.has(row.id) && fixFailed.get(row.id) !== row.originalTitle && !heldElsewhere("fix", row.id)) {
        fixQueue.set(row.id, { topicId: row.id, title: row.originalTitle });
      }
      if (!automatic || row.hidden || errorFor(row.id, row.originalTitle))
        continue;
      if (typeof state?.verdict !== "boolean" && !judging.has(row.id) && !rewriting.has(row.id) && !heldElsewhere("judge", row.id)) {
        judgeQueue.set(row.id, { topicId: row.id, title: row.originalTitle });
      } else if (settings13.store.autoRewrite && state?.verdict === true && !state.rewrittenTitle && !rewriting.has(row.id) && !heldElsewhere("rewrite", row.id) && !autoQueue.some((item) => item.topicId === row.id)) {
        autoQueue.push({ topicId: row.id, title: row.originalTitle });
      }
    }
    if (judgeQueue.size)
      scheduleDrain();
    if (fixQueue.size)
      scheduleFix();
    pumpAuto();
  }
  var deArrow_default = definePlugin({
    name: "DeArrow",
    displayName: "DeArrow 标题党改写",
    description: "在作用范围内的话题列表里自动用 AI 判断标题党，并根据首帖改写成具体中立的标题；其他列表也显示按钮和已改写的标题，可手动改写。还可修正标题里的错别字，改过的字带点状下划线。悬停 ✦ 按钮可临时查看原标题。改写和修正只影响显示，屏蔽规则始终匹配原标题。",
    tags: ["ai", "topics"],
    icon: DeArrowIcon,
    settings: settings13,
    start() {
      scopeRegex = null;
      registerDecorator({ id: "dearrow", order: 20, render: renderButton2 });
      registerProcessor({ id: "dearrow", run: process2 });
      unsubs2.push(subscribe("dataChange", ({ store, ids }) => {
        if (store !== "dearrow")
          return;
        for (const id of ids)
          refreshButtons2(id);
        schedule();
      }));
    },
    stop() {
      for (const unsub of unsubs2.splice(0))
        unsub();
      unregisterDecorator("dearrow");
      unregisterProcessor("dearrow");
      clearOverrides();
      judgeQueue.clear();
      fixQueue.clear();
      autoQueue.length = 0;
    },
    onSettingsChange() {
      scopeRegex = null;
      if (!settings13.store.autoRewrite)
        autoQueue.length = 0;
      if (!settings13.store.fixTypos)
        fixQueue.clear();
      schedule();
    },
    events: {
      navigate() {
        judgeQueue.clear();
        fixQueue.clear();
        autoQueue.length = 0;
        schedule();
      }
    }
  });

  // src/plugins/posterAvatars/index.ts
  var STYLE = "posterAvatars-layout";
  var AVATARS = "td.posters.topic-list-data > a:first-child > img, td.posters.topic-list-data > a.latest > img";
  var ORIGINAL = "data-ldpp-avatar-src";
  var AVATAR_CSS = `.topic-list td.topic-list-data.posters {
    height: auto;
    padding: 0.33em;
    width: 110px;
}
.topic-list td.posters.topic-list-data > a:first-child:not([style*="display: none"]) > img {
    width: 48px;
    height: 48px;
}
@media screen and (max-width: 850px) {
    .topic-list .topic-list-data.posters a.latest > img {
        width: 48px;
        height: 48px;
    }
    .topic-list td.topic-list-data.posters {
        width: 52px;
    }
}`;
  function largerAvatar(src) {
    return /\/24\//.test(src) ? src.replace("/24/", "/48/") : null;
  }
  function enlargeAvatars(rows) {
    for (const row of rows) {
      for (const img of row.el.querySelectorAll(AVATARS)) {
        const src = img.getAttribute("src") ?? "";
        const next = largerAvatar(src);
        if (!next)
          continue;
        img.setAttribute(ORIGINAL, src);
        img.setAttribute("src", next);
      }
    }
  }
  function restoreAvatars() {
    for (const img of document.querySelectorAll(`img[${ORIGINAL}]`)) {
      img.setAttribute("src", img.getAttribute(ORIGINAL) ?? img.src);
      img.removeAttribute(ORIGINAL);
    }
  }
  var posterAvatars_default = definePlugin({
    name: "PosterAvatars",
    displayName: "发布者头像调整",
    description: "话题列表里第一位发布者的头像放大到 48px，并加载 48px 的清晰版本（来自「LinuxDo自定义\uD83D\uDEE0️」脚本）。",
    tags: ["topics"],
    icon: UserCircleIcon,
    enabledByDefault: true,
    startAt: "Init" /* Init */,
    start() {
      registerStyle(STYLE, AVATAR_CSS);
      registerProcessor({ id: "poster-avatars", run: enlargeAvatars });
    },
    stop() {
      unregisterProcessor("poster-avatars");
      unregisterStyle(STYLE);
      restoreAvatars();
    }
  });

  // ldpp-css:src/plugins/noWatermark/styles.css
  registerStyle("noWatermark", `/* 「本页检测」: the count and 重新检测 on one line, then one row per hidden layer. */
.ldpp-field-head > .ldpp-field-control.ldpp-nwm-summary {
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 0.6rem;
}

.ldpp-nwm-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin: 0.25rem 0 0.75rem;
    padding: 0;
    list-style: none;
}

.ldpp-nwm-list > li {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--ldpp-line);
    border-radius: var(--ldpp-radius);
    background: var(--ldpp-soft);
    font-size: var(--ldpp-font-sm);
    overflow-wrap: anywhere;
}

.ldpp-nwm-empty {
    margin: 0.25rem 0 0.75rem;
}

.ldpp-nwm-list > li > code {
    align-self: flex-start;
}
`);

  // src/plugins/noWatermark/shadow.ts
  var roots = new WeakMap;
  var original = null;
  var wrapper = null;
  function shadowRootOf(el) {
    return el.shadowRoot ?? roots.get(el) ?? null;
  }
  function outerHost(node) {
    let el = node;
    for (let root = el.getRootNode();root.host; root = el.getRootNode())
      el = root.host;
    return el;
  }
  function hookShadowRoots(onRoot) {
    const proto = pageWindow.Element.prototype;
    if (wrapper && proto.attachShadow === wrapper)
      return;
    const native = proto.attachShadow;
    original = native;
    wrapper = function(init) {
      const root = native.call(this, init);
      roots.set(this, root);
      try {
        onRoot(root);
      } catch {}
      return root;
    };
    proto.attachShadow = wrapper;
  }
  function unhookShadowRoots() {
    const proto = pageWindow.Element.prototype;
    if (wrapper && proto.attachShadow === wrapper && original)
      proto.attachShadow = original;
    wrapper = original = null;
  }

  // src/plugins/noWatermark/detect.ts
  var realProbe = {
    rect: (el) => el.getBoundingClientRect(),
    style: (el, pseudo) => getComputedStyle(el, pseudo || null),
    viewport: () => ({ width: window.innerWidth, height: window.innerHeight })
  };
  var SKIP = "[data-ldpp], ldpp-styles, ldpp-user-styles, #d-splash, .d-modal, .d-modal__backdrop, .modal-backdrop, .d-header-wrap, #reply-control, .loading-indicator-container, .pswp";
  var INTERACTIVE = "button, a[href], input, textarea, select, iframe, [contenteditable], [tabindex]";
  var EFFECTS = /snow|confetti|firework|particle|sakura|petal/i;
  function currentAccount() {
    try {
      const user = pageWindow.Discourse?.__container__?.lookup("service:current-user");
      if (user?.username)
        return { username: String(user.username), id: String(user.id ?? "") };
    } catch {}
    try {
      const preloaded = JSON.parse(document.getElementById("data-preloaded")?.dataset.preloaded ?? "{}");
      const raw = preloaded.currentUser;
      const user = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (user?.username)
        return { username: String(user.username), id: String(user.id ?? "") };
    } catch {}
    return null;
  }
  function accountPattern(account) {
    if (!account?.username)
      return null;
    const parts = [escapeRegExp(account.username)];
    if (/^\d{3,}$/.test(account.id))
      parts.push(`(?<!\\d)${account.id}(?!\\d)`);
    return new RegExp(parts.join("|"), "i");
  }
  function imageUrls(value) {
    return [...value.matchAll(/url\((["']?)(.*?)\1\)/g)].map((match) => match[2]);
  }
  function decodeSvgImages(urls) {
    return urls.map((url) => {
      const match = url.match(/^data:image\/svg\+xml(;base64)?[^,]*,(.*)$/i);
      if (!match)
        return "";
      try {
        return match[1] ? atob(match[2]) : decodeURIComponent(match[2]);
      } catch {
        return "";
      }
    }).join(`
`);
  }
  var generated = (url) => /^(data|blob):/i.test(url);
  function alphaOf(color) {
    const match = color.match(/rgba?\(([^)]*)\)/);
    if (!match)
      return 1;
    const parts = match[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 4)
      return 1;
    const value = parts[3].endsWith("%") ? Number.parseFloat(parts[3]) / 100 : Number.parseFloat(parts[3]);
    return Number.isFinite(value) ? value : 1;
  }
  function userStyleText() {
    return Array.from(document.querySelectorAll("ldpp-user-styles style, style.stylus"), (style) => style.textContent ?? "").join(`
`);
  }

  class Detector {
    probe;
    pattern;
    userCss;
    constructor(account, probe = realProbe) {
      this.probe = probe;
      this.pattern = accountPattern(account);
      this.userCss = userStyleText();
    }
    covers(el, rect) {
      const view = this.probe.viewport();
      const width = Math.max(0, Math.min(rect.left + rect.width, view.width) - Math.max(rect.left, 0));
      const height = Math.max(0, Math.min(rect.top + rect.height, view.height) - Math.max(rect.top, 0));
      if (view.width * view.height > 0 && width * height / (view.width * view.height) >= 0.5)
        return true;
      const parent = el.parentElement;
      if (!parent || rect.width * rect.height < 200 * 150)
        return false;
      const box = this.probe.rect(parent);
      return rect.width >= box.width * 0.9 && rect.height >= box.height * 0.9;
    }
    mentions(...texts) {
      return Boolean(this.pattern && texts.some((text) => text && this.pattern.test(text)));
    }
    ownImage(urls) {
      return urls.some((url) => this.userCss.includes(url.slice(0, 200)));
    }
    check(el, pseudo = "") {
      if (el.closest(SKIP) || EFFECTS.test(`${el.id} ${el.getAttribute("class") ?? ""}`))
        return null;
      const style = this.probe.style(el, pseudo);
      if (style.display === "none" || style.visibility === "hidden")
        return null;
      if (pseudo && (!style.content || style.content === "none" || style.content === "normal"))
        return null;
      const hostRect = this.probe.rect(el);
      const rect = pseudo ? this.pseudoRect(style, hostRect) : hostRect;
      if (!rect)
        return null;
      const covers = this.covers(el, rect);
      if (!covers && rect.width * rect.height < 300 * 150)
        return null;
      const urls = imageUrls(style.backgroundImage || "");
      if (this.ownImage(urls))
        return null;
      const svgText = decodeSvgImages(urls);
      const text = pseudo ? style.content.replace(/^["']|["']$/g, "") : el.childElementCount < 300 ? (el.textContent ?? "").slice(0, 4000) : "";
      const passThrough = style.pointerEvents === "none";
      const floating = /fixed|absolute|sticky/.test(style.position);
      const faint = Number.parseFloat(style.opacity || "1") < 0.3 || text.trim() !== "" && alphaOf(style.color) < 0.3;
      const blended = Boolean(style.mixBlendMode) && style.mixBlendMode !== "normal";
      const tiled = urls.length > 0 && !/no-repeat/.test(style.backgroundRepeat || "");
      const tile = tiled && urls.some(generated);
      const drawn = el.tagName === "CANVAS" || el.tagName.toLowerCase() === "svg" && Boolean(el.querySelector("text, pattern"));
      const named = this.mentions(text, svgText, pseudo ? "" : el.getAttribute("aria-label") ?? "");
      const reasons = [];
      if (named)
        reasons.push("含你的用户名或 ID");
      if (tile)
        reasons.push(/<text[\s>]/i.test(svgText) ? "平铺的文字图片" : "平铺的生成图片");
      if (drawn)
        reasons.push(el.tagName === "CANVAS" ? "画布" : "SVG 图案");
      if (faint)
        reasons.push("近乎透明");
      if (blended)
        reasons.push(`混合模式 ${style.mixBlendMode}`);
      if (passThrough)
        reasons.push("不挡点击");
      if (!pseudo && el.querySelector(INTERACTIVE))
        return null;
      const layer = covers && (named && (passThrough || faint || blended) || passThrough && floating && (tile || drawn) || passThrough && floating && (faint || blended) && (text.trim() !== "" || urls.length > 0));
      if (layer)
        return { el, pseudo, part: "layer", reasons: [...reasons, "铺满屏幕或容器"] };
      if (!pseudo && tile && (named || /<text[\s>]/i.test(svgText)))
        return { el, pseudo, part: "background", reasons: [...reasons, "画在容器背景里"] };
      return null;
    }
    pseudoRect(style, host) {
      if (!/fixed|absolute/.test(style.position))
        return null;
      const view = this.probe.viewport();
      const base = style.position === "fixed" ? { left: 0, top: 0, width: view.width, height: view.height } : host;
      const width = Number.parseFloat(style.width);
      const height = Number.parseFloat(style.height);
      return { left: base.left, top: base.top, width: Number.isFinite(width) ? width : base.width, height: Number.isFinite(height) ? height : base.height };
    }
    scan(root, out = [], host) {
      const elements = root instanceof Element ? [root, ...root.querySelectorAll("*")] : [...root.querySelectorAll("*")];
      for (const el of elements) {
        const finding = this.check(el);
        if (finding)
          out.push(host ? { ...finding, el: host } : finding);
        if (!finding && this.pseudoCandidate(el)) {
          for (const pseudo of ["::before", "::after"]) {
            const inPseudo = this.check(el, pseudo);
            if (inPseudo)
              out.push(host ? { ...inPseudo, el: host, pseudo: "" } : inPseudo);
          }
        }
        const shadow = shadowRootOf(el);
        if (shadow)
          this.scan(shadow, out, host ?? el);
      }
      return out;
    }
    pseudoCandidate(el) {
      const parent = el.parentElement;
      if (el === document.documentElement || el === document.body || parent === document.body || parent === document.documentElement || el.id)
        return true;
      const rect = this.probe.rect(el);
      const view = this.probe.viewport();
      return rect.width >= view.width * 0.6 && rect.height >= view.height * 0.5;
    }
  }
  var escapeIdent = (value) => typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(value) : value.replace(/[^\w-]/g, (char) => `\\${char}`);
  function selectorFor(el) {
    const parts = [];
    for (let node = el;node && node !== document.documentElement; node = node.parentElement) {
      if (node === document.body) {
        parts.unshift("body");
        continue;
      }
      if (node.id && document.querySelectorAll(`#${escapeIdent(node.id)}`).length === 1) {
        parts.unshift(`#${escapeIdent(node.id)}`);
        return parts.join(" > ");
      }
      const parent = node.parentElement;
      const index = parent ? Array.prototype.indexOf.call(parent.children, node) + 1 : 1;
      const classes = Array.from(node.classList).filter((name) => !/^ember\d/.test(name)).slice(0, 2).map((name) => `.${escapeIdent(name)}`).join("");
      parts.unshift(`${node.tagName.toLowerCase()}${classes}:nth-child(${index})`);
    }
    parts.unshift("html");
    return parts.join(" > ");
  }
  function hidingCss(findings) {
    const scope = "html:not(#ldpp-no-watermark)";
    return findings.map((finding) => {
      const selector = selectorFor(finding.el);
      const target = selector.startsWith("html") ? selector.replace(/^html/, scope) : `${scope} ${selector}`;
      if (finding.pseudo)
        return `${target}${finding.pseudo} { content: none !important; background: none !important; }`;
      if (finding.part === "background")
        return `${target} { background-image: none !important; }`;
      return `${target} { filter: opacity(0) !important; clip-path: inset(50%) !important; }`;
    }).join(`
`);
  }
  function describe(el) {
    const classes = Array.from(el.classList).slice(0, 2).map((name) => `.${name}`).join("");
    return `<${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${classes}>`;
  }

  // src/plugins/noWatermark/index.ts
  var STYLE2 = "no-watermark";
  var FULL_SCAN_DELAY_MS = 400;
  var SAFETY_SCAN_MS = 20000;
  var QUICK_SCAN_LIMIT = 400;
  var logger13 = new Logger("NoWatermark", "#a6e3a1");
  var findings = [];
  var lastScan = null;
  var revealing = false;
  var notified = false;
  var observer4 = null;
  var fullTimer = null;
  var safetyTimer = null;
  var frame3 = 0;
  var pending3 = new Set;
  var refreshView = null;
  var settings14 = definePluginSettings({
    notify: {
      type: 2 /* BOOLEAN */,
      description: "发现并隐藏水印时提示一次",
      default: true
    },
    report: {
      type: 5 /* COMPONENT */,
      description: "本页检测",
      render: () => renderReport()
    }
  });
  var sameFinding = (a, b) => a.el === b.el && a.pseudo === b.pseudo && a.part === b.part;
  function writeStyle() {
    findings = findings.filter((finding) => finding.el.isConnected);
    registerStyle(STYLE2, hidingCss(findings));
    if (revealing)
      disableStyle(STYLE2);
    refreshView?.();
  }
  function report2(fresh) {
    for (const finding of fresh)
      logger13.info(`已隐藏 ${describe(finding.el)}${finding.pseudo}：${finding.reasons.join("、")}`);
    if (!fresh.length || notified || !settings14.store.notify)
      return;
    notified = true;
    showToast(`已隐藏 ${findings.length} 处疑似水印，截图里不会出现（LD++ 设置 → 去除隐藏水印 → 本页检测）`, "info", { key: "no-watermark" });
  }
  function merge(found) {
    const fresh = found.filter((finding) => !findings.some((known) => sameFinding(known, finding)));
    if (fresh.length)
      findings = [...findings, ...fresh];
    writeStyle();
    report2(fresh);
  }
  function measured(measure) {
    if (!findings.length || revealing)
      return measure();
    disableStyle(STYLE2);
    try {
      return measure();
    } finally {
      enableStyle(STYLE2);
    }
  }
  function fullScan() {
    if (fullTimer)
      clearTimeout(fullTimer);
    fullTimer = null;
    if (!document.body)
      return;
    const found = measured(() => new Detector(currentAccount()).scan(document.documentElement));
    const fresh = found.filter((finding) => !findings.some((known) => sameFinding(known, finding)));
    findings = found;
    lastScan = { at: Date.now(), elements: document.getElementsByTagName("*").length };
    writeStyle();
    report2(fresh);
  }
  function scheduleFull(delay = FULL_SCAN_DELAY_MS) {
    if (fullTimer)
      return;
    fullTimer = setTimeout(() => {
      fullTimer = null;
      const idle = globalThis.requestIdleCallback;
      if (idle)
        idle(fullScan, { timeout: 1000 });
      else
        fullScan();
    }, delay);
  }
  function flushPending() {
    frame3 = 0;
    if (!pending3.size)
      return;
    const detector = new Detector(currentAccount());
    const found = [];
    measured(() => {
      for (const el of pending3) {
        if (!el.isConnected)
          continue;
        if (el.getElementsByTagName("*").length > QUICK_SCAN_LIMIT) {
          const own = detector.check(el);
          if (own)
            found.push(own);
          scheduleFull();
        } else {
          detector.scan(el, found);
        }
      }
    });
    pending3.clear();
    if (found.length)
      merge(found);
  }
  function queue(node) {
    const el = outerHost(node);
    pending3.add(el);
    if (frame3)
      return;
    frame3 = typeof requestAnimationFrame === "function" && document.visibilityState !== "hidden" ? requestAnimationFrame(flushPending) : setTimeout(flushPending, 16);
  }
  var isStyleSheet = (node) => node instanceof Element && node.matches("style, link[rel~='stylesheet']");
  var OBSERVE = { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] };
  function watchRoot(root) {
    observer4?.observe(root, OBSERVE);
    queue(root.host);
  }
  function onMutations(records) {
    let treeChanged = false;
    for (const record of records) {
      const target = record.target;
      if (record.type === "childList") {
        if (isOwnNode(target))
          continue;
        treeChanged = true;
        if (isStyleSheet(target) || [...record.addedNodes].some(isStyleSheet))
          scheduleFull();
        for (const node of record.addedNodes)
          if (node instanceof Element && !isStyleSheet(node) && !isOwnNode(node))
            queue(node);
      } else if (target instanceof Element && !isOwnNode(target)) {
        const top = target === document.documentElement || target === document.body || target.parentElement === document.body;
        if (record.attributeName === "style" || top)
          queue(target);
      }
    }
    if (treeChanged && findings.length)
      writeStyle();
  }
  function setRevealing(value) {
    revealing = value;
    if (value)
      disableStyle(STYLE2);
    else
      enableStyle(STYLE2);
  }
  function renderReport() {
    const root = h("div", { class: "ldpp-nwm-report" });
    const render = () => {
      const rows = findings.filter((finding) => finding.el.isConnected);
      const scanned = lastScan ? `上次全页检测：${new Date(lastScan.at).toLocaleTimeString()}，检查了 ${lastScan.elements} 个元素。` : "尚未完成全页检测。";
      root.replaceChildren(Field("本页隐藏的水印", h("span", { class: "ldpp-field-control ldpp-nwm-summary" }, h("span", null, rows.length ? `${rows.length} 处` : "未发现"), Button("重新检测", { small: true, onClick: () => fullScan() }))), rows.length ? h("ul", { class: "ldpp-nwm-list" }, rows.map((finding) => h("li", null, h("code", null, `${describe(finding.el)}${finding.pseudo}`), h("span", { class: "ldpp-muted" }, `${finding.part === "background" ? "去掉背景" : "整层隐藏"}：${finding.reasons.join("、")}`)))) : h("p", { class: "ldpp-muted ldpp-nwm-empty" }, "没有找到铺在页面上的水印层。烧进图片里的水印、浏览器指纹不在检测范围内。"), Field("临时显示（核对用）", Switch(revealing, (value) => setRevealing(value), "临时显示")), h("p", { class: "ldpp-muted" }, scanned));
    };
    refreshView = () => {
      if (root.isConnected)
        render();
      else {
        refreshView = null;
        if (revealing)
          setRevealing(false);
      }
    };
    render();
    return root;
  }
  var noWatermark_default = definePlugin({
    name: "NoWatermark",
    displayName: "去除隐藏水印",
    description: "找出页面上与账号关联的隐藏水印（铺满屏幕的半透明用户名、平铺的水印图、透明画布等）并用样式藏起来，截图里就不会带上；不删除、不改动网页自己的元素。烧进图片里的水印和浏览器指纹不在此列。",
    tags: ["reading"],
    icon: EraserIcon,
    enabledByDefault: true,
    startAt: "Init" /* Init */,
    settings: settings14,
    start() {
      observer4 = new MutationObserver(onMutations);
      observer4.observe(document.documentElement, OBSERVE);
      hookShadowRoots(watchRoot);
      scheduleFull(0);
      safetyTimer = setInterval(() => {
        refreshView?.();
        if (document.visibilityState !== "hidden")
          scheduleFull(0);
      }, SAFETY_SCAN_MS);
    },
    stop() {
      observer4?.disconnect();
      observer4 = null;
      unhookShadowRoots();
      if (fullTimer)
        clearTimeout(fullTimer);
      if (safetyTimer)
        clearInterval(safetyTimer);
      fullTimer = safetyTimer = null;
      pending3.clear();
      findings = [];
      revealing = false;
      unregisterStyle(STYLE2);
      refreshView?.();
    },
    events: {
      navigate() {
        notified = false;
        scheduleFull();
      }
    }
  });

  // src/plugins/customGreeting/index.ts
  var TITLE = ".welcome-banner__title";
  var STYLE3 = "customGreeting-banner";
  var LEGACY_STYLE_ID = "gc-greeting-style-v1";
  var HOME_PATHS = new Set(["/", "/latest", "/top", "/new", "/unread", "/hot", "/categories"]);
  var DEFAULT_GREETINGS = [
    "Ask not what your country can do for you\\n— ask what you can do for your country.",
    "It always seems impossible until it is done.",
    "The best way to predict the future is to create it."
  ].join(`
`);
  var settings15 = definePluginSettings({
    mode: {
      type: 3 /* SELECT */,
      description: "切换时机",
      options: [
        { label: "每次进入首页时", value: "refresh", default: true },
        { label: "停留在首页时定时切换", value: "interval" },
        { label: "点击标题切换", value: "manual" }
      ]
    },
    order: {
      type: 3 /* SELECT */,
      description: "切换顺序",
      options: [
        { label: "顺序", value: "sequential", default: true },
        { label: "随机", value: "random" }
      ]
    },
    intervalSec: {
      type: 1 /* NUMBER */,
      description: "定时切换的间隔（仅「停留在首页时定时切换」）",
      min: 1,
      max: 3600,
      unit: "秒",
      default: 10
    },
    phrases: {
      type: 0 /* STRING */,
      multiline: true,
      description: "问候语：每行一条，\\n 表示换行；留空则显示站点原文",
      default: DEFAULT_GREETINGS
    },
    greetIndex: { type: 6 /* CUSTOM */, default: -1 },
    lastRandom: { type: 6 /* CUSTOM */, default: -1 }
  });
  function parseGreetings(raw) {
    return String(raw ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => line.replaceAll("\\n", `
`));
  }
  function escapeForCssContent(text) {
    return text.replaceAll("\\", "\\\\").replaceAll('"', "\\\"").replaceAll(`
`, "\\A ");
  }
  function greetingCss(text, clickable) {
    return `${TITLE} {
    display: grid !important;
    grid-template-rows: auto !important;
    grid-auto-rows: 0 !important;
    color: transparent !important;
}
${TITLE}::after {
    content: "${escapeForCssContent(text)}";
    grid-row: 1 !important;
    grid-column: 1 !important;
    justify-self: center !important;
    align-self: center !important;
    font-size: inherit !important;
    line-height: inherit !important;
    font-weight: inherit !important;
    color: var(--primary) !important;
    white-space: pre-wrap !important;
    text-align: center !important;
}${clickable ? `
${TITLE} {
    cursor: pointer !important;
    user-select: none !important;
}` : ""}`;
  }
  var mode = () => ["interval", "manual"].includes(String(settings15.store.mode)) ? settings15.store.mode : "refresh";
  var greetings = () => parseGreetings(settings15.store.phrases);
  var isHome = () => HOME_PATHS.has(location.pathname.replace(/\/+$/, "") || "/");
  function pickNextIndex(length, advance, random = Math.random) {
    if (length <= 0)
      return 0;
    const current = Number(settings15.store.greetIndex ?? -1);
    if (length === 1) {
      settings15.store.greetIndex = 0;
      return 0;
    }
    if (!advance) {
      if (current >= 0 && current < length)
        return current;
      settings15.store.greetIndex = 0;
      return 0;
    }
    if (settings15.store.order === "random") {
      const previous = current >= 0 && current < length ? current : Number(settings15.store.lastRandom ?? -1);
      let next = Math.floor(random() * length);
      for (let guard = 0;next === previous && guard < 10; guard++)
        next = Math.floor(random() * length);
      settings15.store.greetIndex = next;
      settings15.store.lastRandom = next;
      return next;
    }
    const next = ((current >= -1 && current < length ? current : -1) + 1) % length;
    settings15.store.greetIndex = next;
    return next;
  }
  var active3 = false;
  var wasHome = false;
  var timer2;
  var listeners6 = null;
  var warnedLegacy3 = false;
  function paint(advance) {
    const list = greetings();
    if (!active3 || !list.length) {
      unregisterStyle(STYLE3);
      return;
    }
    const index = pickNextIndex(list.length, advance);
    registerStyle(STYLE3, greetingCss(list[index] ?? list[0], mode() === "manual" && list.length > 1));
  }
  function stopTimer() {
    if (timer2 !== undefined)
      clearInterval(timer2);
    timer2 = undefined;
  }
  function startTimerIfNeeded() {
    stopTimer();
    if (!active3 || !isHome() || mode() !== "interval" || greetings().length <= 1)
      return;
    const seconds = Math.min(3600, Math.max(1, Number(settings15.store.intervalSec) || 10));
    timer2 = setInterval(() => paint(true), seconds * 1000);
  }
  function warnLegacy() {
    if (warnedLegacy3 || !document.getElementById(LEGACY_STYLE_ID))
      return;
    warnedLegacy3 = true;
    showToast("「问候语自定义」脚本仍在运行，会和 LD++ 同时改写欢迎横幅；LD++ 已内置这个功能，请在脚本管理器中停用旧脚本。", "warning", { key: "custom-greeting-legacy" });
  }
  function onRoute() {
    const home = isHome();
    if (home && !wasHome) {
      paint(mode() === "refresh");
      startTimerIfNeeded();
    } else if (!home && wasHome) {
      stopTimer();
    }
    wasHome = home;
    warnLegacy();
  }
  function onClick(event) {
    if (mode() !== "manual" || greetings().length <= 1)
      return;
    if (!(event.target instanceof Element) || !event.target.closest(TITLE))
      return;
    if (String(window.getSelection?.() ?? "").trim())
      return;
    paint(true);
  }
  function onContextMenu() {
    let last = 0;
    return (event) => {
      if (!(event.target instanceof Element) || !event.target.closest(TITLE))
        return;
      event.preventDefault();
      const now = Date.now();
      if (now - last <= 400) {
        last = 0;
        dispatch("openSettings", { tab: "features", plugin: "CustomGreeting" });
        return;
      }
      last = now;
    };
  }
  var customGreeting_default = definePlugin({
    name: "CustomGreeting",
    displayName: "问候语自定义",
    description: "自定义首页欢迎横幅的问候语：多条文案按顺序或随机轮播，进入首页、定时或点击标题时切换；右键双击标题打开这里的设置。",
    tags: ["reading"],
    icon: MessageCircleIcon,
    enabledByDefault: true,
    settings: settings15,
    start() {
      active3 = true;
      wasHome = false;
      listeners6 = new AbortController;
      document.addEventListener("click", onClick, { signal: listeners6.signal });
      document.addEventListener("contextmenu", onContextMenu(), { signal: listeners6.signal });
      onRoute();
      if (!isHome())
        paint(false);
    },
    stop() {
      active3 = false;
      wasHome = false;
      listeners6?.abort();
      listeners6 = null;
      stopTimer();
      unregisterStyle(STYLE3);
    },
    events: {
      navigate: onRoute
    },
    onSettingsChange() {
      paint(false);
      startTimerIfNeeded();
    }
  });

  // node_modules/pangu/dist/shared/index.js
  var CJK_RADICALS_SUPPLEMENT = "⺀-⻿";
  var KANGXI_RADICALS = "⼀-⿟";
  var HIRAGANA = "぀-ゟ";
  var KATAKANA_NO_MIDDLE_DOT = "゠-ヺー-ヿ";
  var BOPOMOFO = "㄀-ㄯ";
  var ENCLOSED_CJK_LETTERS_AND_MONTHS = "㈀-㋿";
  var CJK_UNIFIED_IDEOGRAPHS_EXTENSION_A = "㐀-䶿";
  var CJK_UNIFIED_IDEOGRAPHS = "一-鿿";
  var CJK_COMPATIBILITY_IDEOGRAPHS = "豈-﫿";
  var GREEK_AND_COPTIC = "Ͱ-Ͽ";
  var LATIN_1_SUPPLEMENT_AFTER_NBSP = "¡-ÿ";
  var NUMBER_FORMS = "⅐-↏";
  var LETTERLIKE_SYMBOLS = "℀-⅏";
  var DINGBATS = "✀-➿";
  var SUPERSCRIPT_SUFFIXES = "®²³¹⁰ⁱ⁴-⁼⁾ⁿ℠™";
  var CJK = `${CJK_RADICALS_SUPPLEMENT}${KANGXI_RADICALS}${HIRAGANA}${KATAKANA_NO_MIDDLE_DOT}${BOPOMOFO}${ENCLOSED_CJK_LETTERS_AND_MONTHS}${CJK_UNIFIED_IDEOGRAPHS_EXTENSION_A}${CJK_UNIFIED_IDEOGRAPHS}${CJK_COMPATIBILITY_IDEOGRAPHS}`;
  var AN = "A-Za-z0-9";
  var A = "A-Za-z";
  var UPPER_AN = "A-Z0-9";
  var OPERATORS = "\\*=&\\-";
  var GRADE_OPERATORS = "\\+\\-\\*";
  var QUOTES = '`"״';
  var LEFT_BRACKETS_BASIC = "\\(\\[\\{";
  var RIGHT_BRACKETS_BASIC = "\\)\\]\\}";
  var LEFT_BRACKETS_EXTENDED = "\\(\\[\\{<>“";
  var RIGHT_BRACKETS_EXTENDED = "\\)\\]\\}<>”";
  var ANS_CJK_AFTER = `${A}${GREEK_AND_COPTIC}0-9@\\$%\\^&\\*\\-\\+\\\\=${LATIN_1_SUPPLEMENT_AFTER_NBSP}${NUMBER_FORMS}${DINGBATS}${LETTERLIKE_SYMBOLS}`;
  var ANS_BEFORE_CJK = `${A}${GREEK_AND_COPTIC}0-9\\$%\\^&\\*\\-\\+\\\\=${LATIN_1_SUPPLEMENT_AFTER_NBSP}${NUMBER_FORMS}${DINGBATS}${LETTERLIKE_SYMBOLS}${SUPERSCRIPT_SUFFIXES}`;
  var FILE_PATH_DIRS = "home|root|usr|etc|var|opt|tmp|dev|mnt|proc|sys|bin|boot|lib|media|run|sbin|srv|node_modules|path|project|src|dist|test|tests|docs|templates|assets|public|static|config|scripts|tools|build|out|target|your|\\.claude|\\.git|\\.vscode";
  var FILE_PATH_CHARS = "[A-Za-z0-9_\\-\\.@\\+\\*]+";
  var UNIX_ABSOLUTE_FILE_PATH = new RegExp(`/(?:\\.?(?:${FILE_PATH_DIRS})|\\.(?:[A-Za-z0-9_\\-]+))(?:/${FILE_PATH_CHARS})*`);
  var UNIX_RELATIVE_FILE_PATH = new RegExp(`(?:\\./)?(?:${FILE_PATH_DIRS})(?:/${FILE_PATH_CHARS})+`);
  var WINDOWS_FILE_PATH = /[A-Z]:\\(?:[A-Za-z0-9_\-\. ]+\\?)+/;
  var ANY_CJK = new RegExp(`[${CJK}]`);
  var CJK_PUNCTUATION = new RegExp(`([${CJK}])([!;,\\?:]+)(?=[${CJK}${AN}])`, "g");
  var PUNCTUATION_CJK = new RegExp(`([!;,\\?]+)(?=[${CJK}])`, "g");
  var CJK_TILDE = new RegExp(`([${CJK}])(~+)(?!=)(?=[${CJK}${AN}])`, "g");
  var CJK_TILDE_EQUALS = new RegExp(`([${CJK}])(~=)`, "g");
  var CJK_PERIOD = new RegExp(`([${CJK}])(\\.)(?![${AN}\\./])(?=[${CJK}${AN}])`, "g");
  var AN_PERIOD_CJK = new RegExp(`([${AN}])(\\.)([${CJK}])`, "g");
  var AN_COLON_CJK = new RegExp(`([${AN}])(:)([${CJK}])`, "g");
  var FIX_CJK_COLON_ANS = new RegExp(`([${CJK}])\\:([${UPPER_AN}\\(\\)])`, "g");
  var DOTS_CJK = new RegExp(`([\\.]{2,}|…)([${CJK}])`, "g");
  var CJK_QUOTE = new RegExp(`([${CJK}])([${QUOTES}])`, "g");
  var QUOTE_CJK = new RegExp(`([${QUOTES}])([${CJK}])`, "g");
  var FIX_QUOTE_ANY_QUOTE = new RegExp(`([${QUOTES}]+)[ ]*([\\s\\S]+?)[ ]*([${QUOTES}]+)`, "g");
  var QUOTE_AN = new RegExp(`([”])([${AN}])`, "g");
  var CJK_QUOTE_AN = new RegExp(`([${CJK}])(")([${AN}])`, "g");
  var CJK_SINGLE_QUOTE_BUT_POSSESSIVE = new RegExp(`([${CJK}])('[^s])`, "g");
  var SINGLE_QUOTE_CJK = new RegExp(`(')([${CJK}])`, "g");
  var FIX_POSSESSIVE_SINGLE_QUOTE = new RegExp(`([${AN}${CJK}])( )('s)`, "g");
  var SINGLE_QUOTE_PURE_CJK = new RegExp(`(')([${CJK}]+)(')`, "g");
  var HASH_ANS_CJK_HASH = new RegExp(`([${CJK}])(#)([${CJK}]+)(#)([${CJK}])`, "g");
  var CJK_HASH = new RegExp(`([${CJK}])(#([^ \\u00a0]))`, "g");
  var HASH_CJK = new RegExp(`(([^ \\u00a0/])#)([${CJK}])`, "g");
  var PRODUCT_NAME = "Apple TV|CATCHPLAY|[Dd]iscovery|Disney|ESPN|Fitness|iCloud|mo ?店|Paramount|PS";
  var PRODUCT_NAME_IN_CJK = "公視|影劇館";
  var CREDIT_RATING = "(?:tw)?(?:AA|BBB|BB|CCC)|tw[AB]";
  var MULTI_LETTER_BLOOD_TYPE = "AB|RhD|Rh";
  var NAME_SUFFIX = `(?:(?<![A-Za-z0-9])(?:(?:${PRODUCT_NAME}|Pro)\\+|(?:${CREDIT_RATING}|${MULTI_LETTER_BLOOD_TYPE})[+-])|(?:${PRODUCT_NAME_IN_CJK})\\+)`;
  var NAME_SUFFIX_AT_END = new RegExp(`${NAME_SUFFIX}$`);
  var CLOSING_AFTER_SUFFIX = /[/)\]}\uff09\u3011\u3015\u3009\u300b\u300d\u300f\uff0c\u3002\u3001\uff1b\uff1a\uff01\uff1f]/;
  var CJK_OPERATOR_ANS = new RegExp(`([${CJK}])(?!\\*\\[)([${OPERATORS}])([${AN}${LEFT_BRACKETS_BASIC}])`, "g");
  var ANS_OPERATOR_CJK = new RegExp(`([${AN}${RIGHT_BRACKETS_BASIC}])([${OPERATORS}])(?<!${NAME_SUFFIX})([${CJK}])`, "g");
  var HYPHEN_CJK_CONTACT = new RegExp(`[${CJK}]\\-|\\-[${CJK}]`);
  var HYPHEN_SEPARATOR = new RegExp(`(?<=[${RIGHT_BRACKETS_BASIC}])\\-(?=[${LEFT_BRACKETS_BASIC}])`, "g");
  var PIPE_CJK_CONTACT = new RegExp(`[${CJK}]\\||\\|[${CJK}]`);
  var PIPE_SEPARATOR = /([^\s|])[ ]*(\|+)[ ]*(?=[^\s|])/g;
  var PLUS_CJK_CONTACT = new RegExp(`[${CJK}]\\+|\\+[${CJK}]`);
  var PLUS_SEPARATOR = /(?<=[^\s+\uff0c\u3002\uff1b\uff1a\uff01\uff1f\u3001\uff08\uff09\u300c\u300d\u300e\u300f\u3010\u3011\u300a\u300b])\+(?=[^\s+\uff0c\u3002\uff1b\uff1a\uff01\uff1f\u3001\uff08\uff09\u300c\u300d\u300e\u300f\u3010\u3011\u300a\u300b])/g;
  var RIGHT_BRACKET_PLUS_FULL_WIDTH_LEFT_BRACKET = new RegExp(`(?<=[${RIGHT_BRACKETS_BASIC}])\\+(?=[\\uff08\\u300c\\u300e\\u3010\\u300a])`, "g");
  var SINGLE_LETTER_GRADE_CJK = new RegExp(`\\b([${A}])([${GRADE_OPERATORS}])([${CJK}])`, "g");
  var CJK_SIGN_DIGIT = new RegExp(`([${CJK}])(\\+)([0-9])`, "g");
  var CJK_HYPHEN_FLAG = new RegExp(`([${CJK}])(\\-)([a-z])\\b`, "g");
  var DIGIT_PLUS_CJK = new RegExp(`\\b([0-9]+)(\\+)([${CJK}])`, "g");
  var CJK_LESS_THAN = new RegExp(`([${CJK}])(<)([${AN}])`, "g");
  var LESS_THAN_CJK = new RegExp(`([${AN}])(<)([${CJK}])`, "g");
  var CJK_GREATER_THAN = new RegExp(`([${CJK}])(>)([${AN}])`, "g");
  var GREATER_THAN_CJK = new RegExp(`([${AN}])(>)([${CJK}])`, "g");
  var CJK_LEFT_BRACKET = new RegExp(`([${CJK}])([${LEFT_BRACKETS_EXTENDED}])`, "g");
  var RIGHT_BRACKET_CJK = new RegExp(`([${RIGHT_BRACKETS_EXTENDED}])([${CJK}])`, "g");
  var ANS_CJK_LEFT_BRACKET_ANY_RIGHT_BRACKET = new RegExp(`([${AN}${CJK}])[ ]*([“])([${AN}${CJK}\\-_ ]+)([”])`, "g");
  var LEFT_BRACKET_ANY_RIGHT_BRACKET_ANS_CJK = new RegExp(`([“])([${AN}${CJK}\\-_ ]+)([”])[ ]*([${AN}${CJK}])`, "g");
  var ANS_CJK_RIGHT_QUOTE_ANY_RIGHT_QUOTE = new RegExp(`([${AN}${CJK}])[ ]*(?<![“][^“”
]*)([”])[ ]*([${AN}${CJK}\\-_ ]+?)[ ]*([”])`, "g");
  var AN_LEFT_BRACKET = new RegExp(`([${AN}])(?<!\\.[${AN}]*)([${LEFT_BRACKETS_BASIC}])`, "g");
  var RIGHT_BRACKET_AN = new RegExp(`([${RIGHT_BRACKETS_BASIC}])([${AN}])`, "g");
  var CJK_UNIX_ABSOLUTE_FILE_PATH = new RegExp(`([${CJK}])(${UNIX_ABSOLUTE_FILE_PATH.source})`, "g");
  var CJK_UNIX_RELATIVE_FILE_PATH = new RegExp(`([${CJK}])(${UNIX_RELATIVE_FILE_PATH.source})`, "g");
  var CJK_WINDOWS_PATH = new RegExp(`([${CJK}])(${WINDOWS_FILE_PATH.source})`, "g");
  var UNIX_ABSOLUTE_FILE_PATH_SLASH_CJK = new RegExp(`(${UNIX_ABSOLUTE_FILE_PATH.source}/)([${CJK}])`, "g");
  var UNIX_RELATIVE_FILE_PATH_SLASH_CJK = new RegExp(`(${UNIX_RELATIVE_FILE_PATH.source}/)([${CJK}])`, "g");
  var CJK_ANS = new RegExp(`([${CJK}])(?![${SUPERSCRIPT_SUFFIXES}])([${ANS_CJK_AFTER}])(?<!${NAME_SUFFIX})`, "g");
  var ANS_CJK = new RegExp(`([${ANS_BEFORE_CJK}])([${CJK}])`, "g");
  var S_A = new RegExp(`(%)([${A}])`, "g");
  var COPYRIGHT_DIGIT = /(\u00a9)([0-9])/g;
  var MIDDLE_DOT = /(?<![ \u00a0\u00b7\u2022\u2027])[\u00b7\u2022\u2027](?![ \u00a0\u00b7\u2022\u2027])/g;
  var VOID_HTML_TAGS = /* @__PURE__ */ new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr"
  ]);
  var BARE_HTML_TAG = /^<([a-zA-Z][a-zA-Z0-9]*)\s*\/?>$/;
  var CLOSING_HTML_TAG = /<\/([a-zA-Z][a-zA-Z0-9]*)/g;
  var CJK_HTML_TAG_MENTION = new RegExp(`([${CJK}])(?=)`, "g");
  var HTML_TAG_MENTION_CJK = new RegExp(`(?<=)([${CJK}])`, "g");
  var HTTP_URL = /(?<![A-Za-z0-9])https?:\/\/[^\s<>"`\u3000-\u303f\uff00-\uffef\u2018\u2019\u201c\u201d\u2026\ue000-\uf8ff]+/g;
  var HTTP_URL_TRAILING_PUNCTUATION = /[.,;:!?'"]+$/;
  var CJK_HTTP_URL = new RegExp(`([${CJK}])(?=)`, "g");
  var BRACKET_PATTERNS = [
    {
      pattern: /<([^<>]*)>/g,
      open: "<",
      close: ">"
    },
    {
      pattern: /\(([^()]*)\)/g,
      open: "(",
      close: ")"
    },
    {
      pattern: /\[([^\[\]]*)\]/g,
      open: "[",
      close: "]"
    },
    {
      pattern: /\{([^{}]*)\}/g,
      open: "{",
      close: "}"
    }
  ];
  var PlaceholderReplacer = class PlaceholderReplacer {
    placeholder;
    startDelimiter;
    endDelimiter;
    static patternCache = /* @__PURE__ */ new Map;
    items = [];
    index = 0;
    pattern;
    constructor(placeholder, startDelimiter, endDelimiter) {
      this.placeholder = placeholder;
      this.startDelimiter = startDelimiter;
      this.endDelimiter = endDelimiter;
      const cacheKey = `${startDelimiter}${placeholder}${endDelimiter}`;
      let pattern = PlaceholderReplacer.patternCache.get(cacheKey);
      if (!pattern) {
        const escapedStart = this.startDelimiter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const escapedEnd = this.endDelimiter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        pattern = new RegExp(`${escapedStart}${this.placeholder}(\\d+)${escapedEnd}`, "g");
        PlaceholderReplacer.patternCache.set(cacheKey, pattern);
      }
      this.pattern = pattern;
    }
    store(item) {
      this.items[this.index] = item;
      return `${this.startDelimiter}${this.placeholder}${this.index++}${this.endDelimiter}`;
    }
    restore(text) {
      if (this.index === 0)
        return text;
      return text.replace(this.pattern, (_match, index) => {
        return this.items[parseInt(index, 10)] || "";
      });
    }
  };
  var Pangu = class {
    version = "10.4.1";
    spaceText(text) {
      if (typeof text !== "string") {
        console.warn(`[pangu] spaceText(text) only accepts string but got ${typeof text}`);
        return text;
      }
      if (text.length <= 1 || !ANY_CJK.test(text))
        return text;
      let newText = text;
      const backtickManager = new PlaceholderReplacer("BACKTICK_CONTENT_", "", "");
      newText = newText.replace(/`([^`]+)`/g, (_match, content) => {
        return `\`${backtickManager.store(content)}\``;
      });
      const urlManager = new PlaceholderReplacer("HTTP_URL_PLACEHOLDER_", "", "");
      newText = newText.replace(HTTP_URL, (match) => {
        const url = this.trimHttpUrl(match);
        return urlManager.store(url) + match.slice(url.length);
      });
      const htmlTagManager = new PlaceholderReplacer("HTML_TAG_PLACEHOLDER_", "", "");
      const mentionedTagManager = new PlaceholderReplacer("HTML_TAG_MENTION_", "", "");
      let hasHtmlTags = false;
      if (newText.includes("<")) {
        hasHtmlTags = true;
        const HTML_TAG_PATTERN = /<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s+[^>]*)?>/g;
        const closedTagNames = /* @__PURE__ */ new Set;
        for (const closingTag of newText.matchAll(CLOSING_HTML_TAG))
          closedTagNames.add(closingTag[1].toLowerCase());
        newText = newText.replace(HTML_TAG_PATTERN, (match) => {
          const bareTag = match.match(BARE_HTML_TAG);
          if (bareTag) {
            const tagName = bareTag[1].toLowerCase();
            if (!VOID_HTML_TAGS.has(tagName) && !closedTagNames.has(tagName))
              return mentionedTagManager.store(match);
          }
          const processedTag = match.replace(/(\w+)="([^"]*)"/g, (_attrMatch, attrName, attrValue) => {
            return `${attrName}="${this.spaceText(attrValue)}"`;
          });
          return htmlTagManager.store(processedTag);
        });
      }
      newText = newText.replace(MIDDLE_DOT, "・");
      newText = newText.replace(DOTS_CJK, "$1 $2");
      newText = newText.replace(CJK_PUNCTUATION, "$1$2 ");
      newText = newText.replace(PUNCTUATION_CJK, "$1 ");
      newText = newText.replace(CJK_TILDE, "$1$2 ");
      newText = newText.replace(CJK_TILDE_EQUALS, "$1 $2 ");
      newText = newText.replace(CJK_PERIOD, "$1$2 ");
      newText = newText.replace(AN_PERIOD_CJK, "$1$2 $3");
      newText = newText.replace(AN_COLON_CJK, "$1$2 $3");
      newText = newText.replace(FIX_CJK_COLON_ANS, "$1：$2");
      newText = newText.replace(CJK_QUOTE, "$1 $2");
      newText = newText.replace(QUOTE_CJK, "$1 $2");
      newText = newText.replace(FIX_QUOTE_ANY_QUOTE, "$1$2$3");
      newText = newText.replace(QUOTE_AN, "$1 $2");
      newText = newText.replace(CJK_QUOTE_AN, "$1$2 $3");
      newText = newText.replace(FIX_POSSESSIVE_SINGLE_QUOTE, "$1's");
      const singleQuoteCJKManager = new PlaceholderReplacer("SINGLE_QUOTE_CJK_PLACEHOLDER_", "", "");
      newText = newText.replace(SINGLE_QUOTE_PURE_CJK, (match) => {
        return singleQuoteCJKManager.store(match);
      });
      newText = newText.replace(CJK_SINGLE_QUOTE_BUT_POSSESSIVE, "$1 $2");
      newText = newText.replace(SINGLE_QUOTE_CJK, "$1 $2");
      newText = singleQuoteCJKManager.restore(newText);
      if (newText.length >= 5)
        newText = newText.replace(HASH_ANS_CJK_HASH, "$1 $2$3$4 $5");
      newText = newText.replace(CJK_HASH, "$1 $2");
      newText = newText.replace(HASH_CJK, "$1 $3");
      const compoundWordManager = new PlaceholderReplacer("COMPOUND_WORD_PLACEHOLDER_", "", "");
      newText = newText.replace(/\b(?:[A-Za-z0-9]*[a-z][A-Za-z0-9]*-[A-Za-z0-9]+|[A-Za-z0-9]+-[A-Za-z0-9]*[a-z][A-Za-z0-9]*|[A-Za-z]+-[0-9]+|[A-Za-z]+[0-9]+-[A-Za-z0-9]+)(?:-[A-Za-z0-9]+)*\b/g, (match) => {
        return compoundWordManager.store(match);
      });
      newText = newText.replace(SINGLE_LETTER_GRADE_CJK, "$1$2 $3");
      newText = newText.replace(CJK_SIGN_DIGIT, "$1 $2$3");
      newText = newText.replace(CJK_HYPHEN_FLAG, "$1 $2$3");
      newText = newText.replace(DIGIT_PLUS_CJK, "$1$2 $3");
      newText = newText.split(`
`).map((line) => {
        return (PLUS_CJK_CONTACT.test(line) ? line.replace(PLUS_SEPARATOR, (_match, offset) => {
          if (!NAME_SUFFIX_AT_END.test(compoundWordManager.restore(line.slice(0, offset + 1))))
            return " + ";
          return CLOSING_AFTER_SUFFIX.test(line[offset + 1] ?? "") ? "+" : "+ ";
        }) : line).replace(RIGHT_BRACKET_PLUS_FULL_WIDTH_LEFT_BRACKET, " +");
      }).join(`
`);
      newText = newText.split(`
`).map((line) => HYPHEN_CJK_CONTACT.test(line) ? line.replace(HYPHEN_SEPARATOR, " - ") : line).join(`
`);
      newText = newText.replace(CJK_OPERATOR_ANS, "$1 $2 $3");
      newText = newText.replace(ANS_OPERATOR_CJK, "$1 $2 $3");
      newText = newText.replace(CJK_LESS_THAN, "$1 $2 $3");
      newText = newText.replace(LESS_THAN_CJK, "$1 $2 $3");
      newText = newText.replace(CJK_GREATER_THAN, "$1 $2 $3");
      newText = newText.replace(GREATER_THAN_CJK, "$1 $2 $3");
      newText = newText.replace(CJK_UNIX_ABSOLUTE_FILE_PATH, "$1 $2");
      newText = newText.replace(CJK_UNIX_RELATIVE_FILE_PATH, "$1 $2");
      newText = newText.replace(CJK_WINDOWS_PATH, "$1 $2");
      newText = newText.replace(UNIX_ABSOLUTE_FILE_PATH_SLASH_CJK, "$1 $2");
      newText = newText.replace(UNIX_RELATIVE_FILE_PATH_SLASH_CJK, "$1 $2");
      newText = newText.split(`
`).map((line) => {
        if (!PIPE_CJK_CONTACT.test(line))
          return line;
        return line.replace(PIPE_SEPARATOR, "$1 $2 ");
      }).join(`
`);
      newText = newText.replace(FIX_QUOTE_ANY_QUOTE, "$1$2$3");
      newText = compoundWordManager.restore(newText);
      newText = newText.replace(CJK_LEFT_BRACKET, "$1 $2");
      newText = newText.replace(RIGHT_BRACKET_CJK, "$1 $2");
      newText = newText.replace(ANS_CJK_LEFT_BRACKET_ANY_RIGHT_BRACKET, "$1 $2$3$4");
      newText = newText.replace(LEFT_BRACKET_ANY_RIGHT_BRACKET_ANS_CJK, "$1$2$3 $4");
      newText = newText.replace(ANS_CJK_RIGHT_QUOTE_ANY_RIGHT_QUOTE, "$1 $2$3$4");
      newText = newText.replace(AN_LEFT_BRACKET, "$1 $2");
      newText = newText.replace(RIGHT_BRACKET_AN, "$1 $2");
      newText = newText.replace(CJK_ANS, "$1 $2");
      newText = newText.replace(ANS_CJK, "$1 $2");
      newText = newText.replace(S_A, "$1 $2");
      newText = newText.replace(COPYRIGHT_DIGIT, "$1 $2");
      newText = this.fixBracketSpacing(newText);
      if (hasHtmlTags) {
        newText = newText.replace(CJK_HTML_TAG_MENTION, "$1 ");
        newText = newText.replace(HTML_TAG_MENTION_CJK, " $1");
        newText = mentionedTagManager.restore(newText);
        newText = htmlTagManager.restore(newText);
      }
      newText = newText.replace(CJK_HTTP_URL, "$1 ");
      newText = urlManager.restore(newText);
      newText = backtickManager.restore(newText);
      return newText;
    }
    hasProperSpacing(text) {
      return this.spaceText(text) === text;
    }
    trimHttpUrl(url) {
      let unbalancedClosingParentheses = (url.match(/\)/g) ?? []).length - (url.match(/\(/g) ?? []).length;
      for (;; ) {
        const trimmed = url.replace(HTTP_URL_TRAILING_PUNCTUATION, "");
        if (trimmed.endsWith(")") && unbalancedClosingParentheses > 0) {
          unbalancedClosingParentheses--;
          url = trimmed.slice(0, -1);
          continue;
        }
        if (trimmed === url)
          return url;
        url = trimmed;
      }
    }
    fixBracketSpacing(text) {
      for (const { pattern, open, close } of BRACKET_PATTERNS)
        text = text.replace(pattern, (_match, innerContent) => {
          if (!innerContent)
            return `${open}${close}`;
          const trimmedContent = innerContent.replace(/^ +| +$/g, "");
          return `${open}${trimmedContent}${close}`;
        });
      return text;
    }
  };
  var pangu = new Pangu;

  // node_modules/pangu/dist/browser/dom/boundary-spacing.js
  var QUOTE = /["\u201c\u201d]/;
  function decideBoundarySpacing(boundarySpacingContext) {
    if (boundarySpacingContext.currentEndsWithSpace || boundarySpacingContext.nextStartsWithSpace || boundarySpacingContext.whitespaceBetween || boundarySpacingContext.spaceLikeBetween)
      return "none";
    if (boundarySpacingContext.contentBetween)
      return "none";
    if (!needsBoundarySpace(boundarySpacingContext.currentTail, boundarySpacingContext.nextFirst))
      return "none";
    if (boundarySpacingContext.blockEdgeBetween)
      return "none";
    if (!boundarySpacingContext.nextBoundaryIsSpaceSensitive) {
      if (boundarySpacingContext.nextBoundaryIsIgnored || boundarySpacingContext.precedingNodeHidden())
        return "none";
      return "prepend-next";
    }
    if (!boundarySpacingContext.currentBoundaryIsSpaceSensitive) {
      if (boundarySpacingContext.currentNodeHidden() || boundarySpacingContext.nextNodeHidden())
        return "none";
      return "append-current";
    }
    if (boundarySpacingContext.currentNodeHidden() || boundarySpacingContext.nextNodeHidden())
      return "none";
    if (boundarySpacingContext.inGridOrFlexContainer())
      return "none";
    return "insert-element";
  }
  function decideTextNodeSpacing(textNodeSpacingContext) {
    const textNodeSpacingDecisions = [];
    let { text } = textNodeSpacingContext;
    if (text.startsWith(" ") && textNodeSpacingContext.precedingNodeHidden()) {
      textNodeSpacingDecisions.push("trim-leading-space");
      text = text.substring(1);
    }
    if (isStandaloneQuote(text)) {
      if (textNodeSpacingContext.previousElementLastChar !== null && ANY_CJK.test(textNodeSpacingContext.previousElementLastChar))
        textNodeSpacingDecisions.push("prepend-space");
    } else
      textNodeSpacingDecisions.push("apply-text-spacing");
    return textNodeSpacingDecisions;
  }
  var spacedJunctionCache = /* @__PURE__ */ new Map;
  var SPACED_JUNCTION_CACHE_MAX = 4096;
  function spaceJunction(currentTail, nextFirst) {
    const junction = `${currentTail}${nextFirst}`;
    const cached = spacedJunctionCache.get(junction);
    if (cached !== undefined)
      return cached;
    const spacedJunction = pangu.spaceText(junction);
    if (spacedJunctionCache.size >= SPACED_JUNCTION_CACHE_MAX)
      spacedJunctionCache.clear();
    spacedJunctionCache.set(junction, spacedJunction);
    return spacedJunction;
  }
  function needsBoundarySpace(currentTail, nextFirst) {
    return spaceJunction(currentTail, nextFirst).endsWith(` ${nextFirst}`) && !isQuoteNextToCjk(currentTail.slice(-1), nextFirst);
  }
  function respaceCurrentTail(currentTail, nextFirst) {
    const spacedJunction = spaceJunction(currentTail, nextFirst);
    if (!spacedJunction.endsWith(` ${nextFirst}`))
      return null;
    const spacedTail = spacedJunction.slice(0, -2);
    return spacedTail === currentTail ? null : spacedTail;
  }
  function isQuoteNextToCjk(currentLast, nextFirst) {
    return QUOTE.test(currentLast) && ANY_CJK.test(nextFirst) || ANY_CJK.test(currentLast) && /["\u201d]/.test(nextFirst);
  }
  function isStandaloneQuote(text) {
    return text.length === 1 && QUOTE.test(text);
  }

  // node_modules/pangu/dist/browser/dom/dom-walker.js
  var DomWalker = class {
    static ignoredClass = "no-pangu-spacing";
    static ignoredTags = /^(code|pre|script|style|textarea|iframe|input)$/i;
    static blockTags = /^(div|p|h1|h2|h3|h4|h5|h6)$/i;
    static spaceLikeTags = /^(br|hr|i|img|pangu)$/i;
    static spaceSensitiveTags = /^(a|del|i|pre|s|strike|u)$/i;
    static collectTextNodes(root, reverse = false) {
      const nodes = [];
      if (!root || root instanceof DocumentFragment)
        return nodes;
      const walker = this.createTextWalker(root);
      while (walker.nextNode())
        nodes.push(walker.currentNode);
      return reverse ? nodes.reverse() : nodes;
    }
    static findAdjacentTextNode(textNode, direction) {
      let root = textNode;
      while (root.parentNode && root !== document.body && !this.blockTags.test(root.nodeName))
        root = root.parentNode;
      const walker = this.createTextWalker(root);
      walker.currentNode = textNode;
      return direction === "previous" ? walker.previousNode() : walker.nextNode();
    }
    static findBoundaryNode(textNode, edge) {
      let node = textNode;
      while (node.parentNode && !this.spaceSensitiveTags.test(node.nodeName) && (edge === "first" ? this.isFirstTextChild(node.parentNode, node) : this.isLastTextChild(node.parentNode, node)))
        node = node.parentNode;
      return node;
    }
    static isFirstTextChild(parentNode, targetNode) {
      const { childNodes } = parentNode;
      for (const childNode of childNodes)
        if (childNode.nodeType !== Node.COMMENT_NODE && childNode.textContent)
          return childNode === targetNode;
      return false;
    }
    static isLastTextChild(parentNode, targetNode) {
      const { childNodes } = parentNode;
      for (let i = childNodes.length - 1;i > -1; i--) {
        const childNode = childNodes[i];
        if (childNode.nodeType !== Node.COMMENT_NODE && childNode.textContent)
          return childNode === targetNode;
      }
      return false;
    }
    static createTextWalker(root) {
      return document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (node) => {
        if (!node.nodeValue || !/\S/.test(node.nodeValue))
          return NodeFilter.FILTER_REJECT;
        return this.isIgnoredNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      } });
    }
    static isIgnoredNode(node) {
      let currentNode = node;
      while (currentNode) {
        if (currentNode instanceof Element && this.isIgnoredElement(currentNode))
          return true;
        currentNode = currentNode.parentNode;
      }
      return false;
    }
    static isIgnoredElement(element) {
      return this.ignoredTags.test(element.nodeName) || this.isContentEditable(element) || element.classList.contains(this.ignoredClass);
    }
    static isContentEditable(node) {
      return node instanceof HTMLElement && (node.isContentEditable || node.getAttribute("g_editable") === "true");
    }
  };

  // node_modules/pangu/dist/browser/dom/visibility-detector.js
  var VisibilityDetector = class {
    cache = /* @__PURE__ */ new WeakMap;
    clearCache() {
      this.cache = /* @__PURE__ */ new WeakMap;
    }
    isElementVisuallyHidden(element) {
      const style = getComputedStyle(element);
      if (style.display === "none")
        return true;
      if (style.visibility === "hidden")
        return true;
      if (parseFloat(style.opacity) === 0)
        return true;
      const clip = style.clip;
      if (clip && (clip.includes("rect(1px, 1px, 1px, 1px)") || clip.includes("rect(0px, 0px, 0px, 0px)") || clip.includes("rect(0, 0, 0, 0)")))
        return true;
      if (style.overflow === "hidden" && style.position === "absolute") {
        const height = parseInt(style.height, 10);
        const width = parseInt(style.width, 10);
        if (height === 1 && width === 1)
          return true;
      }
      return false;
    }
    shouldSkipSpacingAfterNode(node) {
      let elementToCheck = null;
      if (node instanceof Element)
        elementToCheck = node;
      else if (node.parentElement)
        elementToCheck = node.parentElement;
      if (elementToCheck && this.isElementVisuallyHiddenCached(elementToCheck))
        return true;
      let currentElement = elementToCheck?.parentElement;
      while (currentElement) {
        if (this.isElementVisuallyHiddenCached(currentElement))
          return true;
        currentElement = currentElement.parentElement;
      }
      return false;
    }
    shouldSkipSpacingBeforeNode(node) {
      let previousNode = node.previousSibling;
      if (!previousNode && node.parentElement) {
        let parent = node.parentElement;
        while (parent && !previousNode) {
          previousNode = parent.previousSibling;
          if (!previousNode)
            parent = parent.parentElement;
        }
      }
      if (previousNode) {
        if (previousNode instanceof Element && this.isElementVisuallyHiddenCached(previousNode))
          return true;
        else if (previousNode instanceof Text && previousNode.parentElement && this.isElementVisuallyHiddenCached(previousNode.parentElement))
          return true;
      }
      return false;
    }
    isElementVisuallyHiddenCached(element) {
      const cached = this.cache.get(element);
      if (cached !== undefined)
        return cached;
      const hidden = this.isElementVisuallyHidden(element);
      this.cache.set(element, hidden);
      return hidden;
    }
  };

  // node_modules/pangu/dist/browser/scheduling/task-scheduler.js
  var TaskQueue = class {
    queue = [];
    isProcessing = false;
    add(task) {
      this.queue.push(task);
      this.scheduleProcessing();
    }
    clear() {
      this.queue.length = 0;
    }
    get length() {
      return this.queue.length;
    }
    scheduleProcessing() {
      if (!this.isProcessing && this.queue.length > 0) {
        this.isProcessing = true;
        requestIdleCallback((deadline) => this.process(deadline), { timeout: 5000 });
      }
    }
    process(deadline) {
      try {
        while (deadline.timeRemaining() > 0 && this.queue.length > 0)
          this.queue.shift()?.();
      } finally {
        this.isProcessing = false;
        if (this.queue.length > 0)
          this.scheduleProcessing();
      }
    }
  };
  var TaskScheduler = class {
    config = {
      enabled: true,
      timeout: 2000
    };
    taskQueue = new TaskQueue;
    get queue() {
      return this.taskQueue;
    }
  };

  // node_modules/pangu/dist/browser/scheduling/timing.js
  function once(func) {
    let executed = false;
    return function(...args) {
      if (executed)
        return;
      executed = true;
      return func(...args);
    };
  }
  function debounce2(func, delay, mustRunDelay = Infinity) {
    let timer = null;
    let startTime = null;
    return function(...args) {
      const currentTime = Date.now();
      if (timer)
        clearTimeout(timer);
      if (!startTime)
        startTime = currentTime;
      if (currentTime - startTime >= mustRunDelay) {
        func(...args);
        startTime = currentTime;
      } else
        timer = window.setTimeout(() => {
          func(...args);
        }, delay);
    };
  }
  function waitForVideosToLoad(delayMs, onLoaded) {
    const videos = Array.from(document.getElementsByTagName("video")).filter((video) => video.getClientRects().length > 0);
    if (videos.length === 0)
      setTimeout(onLoaded, delayMs);
    else if (videos.every((video) => video.readyState >= 3))
      setTimeout(onLoaded, delayMs);
    else {
      let loadedCount = 0;
      const videoCount = videos.length;
      const checkAllLoaded = () => {
        loadedCount++;
        if (loadedCount >= videoCount)
          setTimeout(onLoaded, delayMs);
      };
      for (const video of videos)
        if (video.readyState >= 3)
          checkAllLoaded();
        else
          video.addEventListener("loadeddata", checkAllLoaded, { once: true });
      setTimeout(onLoaded, delayMs + 5000);
    }
  }

  // node_modules/pangu/dist/browser/index.js
  var BrowserPangu = class BrowserPangu extends Pangu {
    static trailingWhitespace = /\s$/;
    static leadingWhitespace = /^\s/;
    static maxSyncTextNodes = 256;
    autoSpacePageObserver = null;
    lastWrittenData = /* @__PURE__ */ new WeakMap;
    lateFixedTextNodes = /* @__PURE__ */ new WeakSet;
    taskScheduler = new TaskScheduler;
    visibilityDetector = new VisibilityDetector;
    onTextNodesSettled = null;
    autoSpacePage({ pageDelayMs = 1000, nodeDelayMs = 500, nodeMaxWaitMs = 2000 } = {}) {
      if (!(document.body instanceof Node))
        return;
      if (this.autoSpacePageObserver)
        return;
      const observer = this.setupAutoSpacePageObserver(nodeDelayMs, nodeMaxWaitMs);
      waitForVideosToLoad(pageDelayMs, once(() => {
        if (this.autoSpacePageObserver === observer)
          this.spacePage();
      }));
    }
    spacePage() {
      const title = document.querySelector("head > title");
      if (title)
        this.spaceNode(title);
      this.spaceNode(document.body);
    }
    spaceNode(node) {
      const textNodes = DomWalker.collectTextNodes(node, true);
      this.schedule(() => this.spaceTextNodes(textNodes));
    }
    stopAutoSpacePage() {
      if (this.autoSpacePageObserver) {
        this.autoSpacePageObserver.disconnect();
        this.autoSpacePageObserver = null;
      }
    }
    applyLateFixes(lateFixes) {
      this.schedule(() => {
        for (const lateFix of lateFixes) {
          if (!lateFix.node.isConnected || lateFix.node.data !== lateFix.settled || DomWalker.isIgnoredNode(lateFix.node))
            continue;
          lateFix.node.data = lateFix.data;
          this.lastWrittenData.set(lateFix.node, lateFix.data);
          this.lateFixedTextNodes.add(lateFix.node);
        }
      });
    }
    isGridOrFlexContainer(node) {
      if (node.nodeType !== Node.ELEMENT_NODE)
        return false;
      const display = window.getComputedStyle(node).display;
      return display === "grid" || display === "inline-grid" || display === "flex" || display === "inline-flex";
    }
    spaceTextNodes(textNodes) {
      this.visibilityDetector.clearCache();
      const unsettledTextNodes = [];
      let nextTextNode = null;
      for (const currentTextNode of textNodes) {
        if (currentTextNode instanceof Text)
          if (this.holdsLateFix(currentTextNode)) {
            if (this.onTextNodesSettled)
              unsettledTextNodes.push({
                node: currentTextNode,
                unspaced: currentTextNode.data
              });
          } else
            this.applyTextNodeSpacing(currentTextNode, unsettledTextNodes);
        if (nextTextNode) {
          if (!(currentTextNode instanceof Text) || !(nextTextNode instanceof Text))
            continue;
          const nextSuperscript = nextTextNode.parentElement?.closest("sup");
          if (nextSuperscript && !nextSuperscript.contains(currentTextNode)) {
            nextTextNode = currentTextNode;
            continue;
          }
          const currentBoundaryNode = DomWalker.findBoundaryNode(currentTextNode, "last");
          const nextBoundaryNode = DomWalker.findBoundaryNode(nextTextNode, "first");
          const { whitespaceBetween, contentBetween, spaceLikeBetween, blockEdgeBetween } = this.scanBetweenTextNodes(currentTextNode, nextTextNode);
          const currentNode = currentTextNode;
          const nextNode = nextTextNode;
          const currentTail = currentTextNode.data.match(/(?<![A-Za-z0-9])[A-Za-z0-9]{3,}[+-]$/)?.[0] ?? currentTextNode.data.slice(-3);
          const nextFirst = nextTextNode.data.slice(0, 1);
          const boundarySpacingDecision = decideBoundarySpacing({
            currentTail,
            nextFirst,
            currentEndsWithSpace: BrowserPangu.trailingWhitespace.test(currentTextNode.data),
            nextStartsWithSpace: BrowserPangu.leadingWhitespace.test(nextTextNode.data),
            whitespaceBetween,
            contentBetween,
            spaceLikeBetween,
            blockEdgeBetween,
            currentBoundaryIsSpaceSensitive: DomWalker.spaceSensitiveTags.test(currentBoundaryNode.nodeName) || currentTextNode.parentElement?.closest("sup")?.contains(nextTextNode) === false,
            nextBoundaryIsIgnored: DomWalker.ignoredTags.test(nextBoundaryNode.nodeName),
            nextBoundaryIsSpaceSensitive: DomWalker.spaceSensitiveTags.test(nextBoundaryNode.nodeName),
            precedingNodeHidden: () => this.isPrecedingNodeHidden(nextNode),
            currentNodeHidden: () => this.isNodeHidden(currentNode),
            nextNodeHidden: () => this.isNodeHidden(nextNode),
            inGridOrFlexContainer: () => !!nextBoundaryNode.parentNode && this.isGridOrFlexContainer(nextBoundaryNode.parentNode)
          });
          if (boundarySpacingDecision !== "none" && !this.holdsLateFix(currentTextNode) && !NAME_SUFFIX_AT_END.test(currentTextNode.data)) {
            const respacedTail = respaceCurrentTail(currentTail, nextFirst);
            if (respacedTail !== null) {
              currentTextNode.data = currentTextNode.data.slice(0, currentTextNode.data.length - currentTail.length) + respacedTail;
              this.lastWrittenData.set(currentTextNode, currentTextNode.data);
            }
          }
          switch (boundarySpacingDecision) {
            case "prepend-next":
              nextTextNode.data = ` ${nextTextNode.data}`;
              this.lastWrittenData.set(nextTextNode, nextTextNode.data);
              break;
            case "append-current":
              currentTextNode.data = `${currentTextNode.data} `;
              this.lastWrittenData.set(currentTextNode, currentTextNode.data);
              break;
            case "insert-element":
              this.insertPanguElement(nextBoundaryNode);
              break;
            case "none":
              break;
          }
        }
        nextTextNode = currentTextNode;
      }
      this.emitTextNodesSettled(unsettledTextNodes);
    }
    holdsLateFix(textNode) {
      return this.lateFixedTextNodes.has(textNode) && this.lastWrittenData.get(textNode) === textNode.data;
    }
    emitTextNodesSettled(unsettledTextNodes) {
      if (unsettledTextNodes.length === 0)
        return;
      const settledTextNodes = unsettledTextNodes.map(({ node, unspaced }) => ({
        node,
        unspaced,
        settled: node.data
      }));
      this.onTextNodesSettled?.(settledTextNodes);
    }
    applyTextNodeSpacing(textNode, unsettledTextNodes) {
      this.lateFixedTextNodes.delete(textNode);
      const textNodeSpacingDecisions = decideTextNodeSpacing({
        text: textNode.data,
        previousElementLastChar: this.findPreviousElementLastChar(textNode),
        precedingNodeHidden: () => this.isPrecedingNodeHidden(textNode)
      });
      for (const textNodeSpacingDecision of textNodeSpacingDecisions)
        switch (textNodeSpacingDecision) {
          case "trim-leading-space":
            textNode.data = textNode.data.substring(1);
            this.lastWrittenData.set(textNode, textNode.data);
            break;
          case "prepend-space":
            textNode.data = ` ${textNode.data}`;
            this.lastWrittenData.set(textNode, textNode.data);
            break;
          case "apply-text-spacing": {
            if (this.onTextNodesSettled)
              unsettledTextNodes.push({
                node: textNode,
                unspaced: textNode.data
              });
            const newText = this.spaceText(textNode.data);
            if (textNode.data !== newText) {
              textNode.data = newText;
              this.lastWrittenData.set(textNode, textNode.data);
            }
            break;
          }
        }
    }
    spaceNodeSync(node, maxTextNodes) {
      const textNodes = DomWalker.collectTextNodes(node);
      if (textNodes.length > maxTextNodes)
        return false;
      this.spaceTextNodes(this.withNeighborTextNodes(textNodes).reverse());
      return true;
    }
    withNeighborTextNodes(textNodes) {
      const firstTextNode = textNodes[0];
      const lastTextNode = textNodes.at(-1);
      if (!firstTextNode || !lastTextNode)
        return textNodes;
      const previousTextNode = DomWalker.findAdjacentTextNode(firstTextNode, "previous");
      const nextTextNode = DomWalker.findAdjacentTextNode(lastTextNode, "next");
      return [
        ...previousTextNode ? [previousTextNode] : [],
        ...textNodes,
        ...nextTextNode ? [nextTextNode] : []
      ];
    }
    hasSpacedTextInSubtree(node) {
      if (node instanceof Text)
        return this.lastWrittenData.has(node);
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      while (walker.nextNode())
        if (this.lastWrittenData.has(walker.currentNode))
          return true;
      return false;
    }
    insertPanguElement(nextBoundaryNode) {
      const panguSpace = document.createElement("pangu");
      panguSpace.innerHTML = " ";
      if (nextBoundaryNode.parentNode)
        nextBoundaryNode.parentNode.insertBefore(panguSpace, nextBoundaryNode);
      if (!panguSpace.previousElementSibling) {
        if (panguSpace.parentNode)
          panguSpace.parentNode.removeChild(panguSpace);
      }
    }
    findPreviousElementLastChar(textNode) {
      const previousNode = textNode.previousSibling;
      if (previousNode?.nodeType === Node.ELEMENT_NODE && previousNode.textContent)
        return previousNode.textContent.slice(-1);
      return null;
    }
    scanBetweenTextNodes(currentTextNode, nextTextNode) {
      let whitespaceBetween = false;
      let contentBetween = false;
      let spaceLikeBetween = false;
      let blockEdgeBetween = false;
      const scan = (node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent) {
          if (/\s/.test(node.textContent))
            whitespaceBetween = true;
          if (/\S/.test(node.textContent))
            contentBetween = true;
        } else if (node instanceof Element && DomWalker.spaceLikeTags.test(node.nodeName))
          spaceLikeBetween = true;
        else if (node instanceof Element && !DomWalker.isIgnoredElement(node))
          for (let child = node.firstChild;child; child = child.nextSibling)
            scan(child);
      };
      let containerOfNext = null;
      let node = currentTextNode;
      while (node && !containerOfNext) {
        if (DomWalker.blockTags.test(node.nodeName)) {
          blockEdgeBetween = true;
          break;
        }
        let sibling = node.nextSibling;
        while (sibling && !sibling.contains(nextTextNode)) {
          scan(sibling);
          sibling = sibling.nextSibling;
        }
        containerOfNext = sibling;
        node = node.parentNode;
      }
      while (containerOfNext && containerOfNext !== nextTextNode) {
        if (DomWalker.blockTags.test(containerOfNext.nodeName)) {
          blockEdgeBetween = true;
          break;
        }
        let child = containerOfNext.firstChild;
        while (child && !child.contains(nextTextNode)) {
          scan(child);
          child = child.nextSibling;
        }
        containerOfNext = child;
      }
      return {
        whitespaceBetween,
        contentBetween,
        spaceLikeBetween,
        blockEdgeBetween
      };
    }
    isPrecedingNodeHidden(node) {
      return this.visibilityDetector.shouldSkipSpacingBeforeNode(node);
    }
    isNodeHidden(node) {
      return this.visibilityDetector.shouldSkipSpacingAfterNode(node);
    }
    schedule(task) {
      if (!this.taskScheduler.config.enabled || typeof requestIdleCallback !== "function") {
        task();
        return;
      }
      this.taskScheduler.queue.add(task);
    }
    setupAutoSpacePageObserver(nodeDelayMs, nodeMaxWaitMs) {
      const queue = [];
      const spaceTitleDebounced = debounce2(() => {
        if (this.autoSpacePageObserver !== observer)
          return;
        const titleElement = document.querySelector("head > title");
        if (titleElement)
          this.spaceNode(titleElement);
      }, nodeDelayMs, nodeMaxWaitMs);
      const spaceQueuedNodesDebounced = debounce2(() => {
        if (this.autoSpacePageObserver !== observer)
          return;
        const nodesToProcess = [...queue];
        queue.length = 0;
        if (nodesToProcess.length === 0)
          return;
        nodesToProcess.sort((a, b) => {
          if (a === b)
            return 0;
          return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
        const seenTextNodes = /* @__PURE__ */ new Set;
        const allTextNodes = [];
        for (const node of nodesToProcess) {
          const textNodes = DomWalker.collectTextNodes(node);
          for (const textNode of this.withNeighborTextNodes(textNodes))
            if (!seenTextNodes.has(textNode)) {
              seenTextNodes.add(textNode);
              allTextNodes.push(textNode);
            }
        }
        allTextNodes.reverse();
        this.schedule(() => this.spaceTextNodes(allTextNodes));
      }, nodeDelayMs, nodeMaxWaitMs);
      const observer = new MutationObserver((mutations) => {
        let titleChanged = false;
        let removedSpacedContent = false;
        for (const mutation of mutations) {
          for (const node of mutation.removedNodes)
            if (this.hasSpacedTextInSubtree(node)) {
              removedSpacedContent = true;
              break;
            }
          if (removedSpacedContent)
            break;
        }
        for (const mutation of mutations) {
          if (mutation.target.parentNode?.nodeName === "TITLE" || mutation.target.nodeName === "TITLE") {
            titleChanged = true;
            continue;
          }
          switch (mutation.type) {
            case "characterData": {
              const { target: node } = mutation;
              if (node instanceof Text && node.parentNode) {
                const lastWritten = this.lastWrittenData.get(node);
                if (lastWritten !== undefined) {
                  if (node.data === lastWritten)
                    break;
                  if (this.spaceNodeSync(node.parentNode, BrowserPangu.maxSyncTextNodes))
                    break;
                }
                queue.push(node.parentNode);
              }
              break;
            }
            case "childList":
              for (const node of mutation.addedNodes)
                if (node.nodeType === Node.ELEMENT_NODE) {
                  if (removedSpacedContent && this.spaceNodeSync(node, BrowserPangu.maxSyncTextNodes))
                    continue;
                  queue.push(node);
                } else if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
                  if (removedSpacedContent && this.spaceNodeSync(node.parentNode, BrowserPangu.maxSyncTextNodes))
                    continue;
                  queue.push(node.parentNode);
                }
              break;
            default:
              break;
          }
        }
        if (titleChanged)
          spaceTitleDebounced();
        spaceQueuedNodesDebounced();
      });
      this.autoSpacePageObserver = observer;
      observer.observe(document.head, {
        characterData: true,
        childList: true,
        subtree: true
      });
      observer.observe(document.body, {
        characterData: true,
        childList: true,
        subtree: true
      });
      return observer;
    }
  };
  var pangu2 = new BrowserPangu;

  // src/plugins/panguSpacing/index.ts
  var SCOPE = ".cooked, h1";
  var SKIP2 = ".d-editor-preview";
  var BUTTON = "ldpp-pangu-button";
  var PROTECTED = [
    [/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^\1[ \t]*$|(?![\s\S]))/gm, false],
    [/`[^`\n]+`/g, true],
    [/!\[[^\]\n]*\]\([^)\n]*\)/g, false],
    [/\]\([^)\n]*\)/g, false],
    [/https?:\/\/[\w\-.~:/?#@!$&'*+,;=%]+/g, true],
    [/<\/?[a-z][^>\n]*>/gi, false],
    [/\[\/?[a-z]+(?:[= ][^\]\n]*)?\]/gi, false],
    [/:[a-z0-9_+-]+:/g, false]
  ];
  var WORD_TOKEN = /ldppz(\d+)z/g;
  var MARK_START = "";
  var MARK_END = "";
  var MARK_TOKEN = new RegExp(`${MARK_START}([-]+)${MARK_END}`, "g");
  var markOf = (index) => MARK_START + [...String(index)].map((digit) => String.fromCharCode(57344 + Number(digit))).join("") + MARK_END;
  var indexOf = (digits) => Number([...digits].map((char) => char.charCodeAt(0) - 57344).join(""));
  function spaceMarkdown(text) {
    const kept = [];
    let masked = text;
    for (const [pattern, spaced] of PROTECTED) {
      masked = masked.replace(pattern, (match) => {
        kept.push(match);
        return spaced ? `ldppz${kept.length - 1}z` : markOf(kept.length - 1);
      });
    }
    let result = pangu2.spaceText(masked);
    for (let round = 0;round < PROTECTED.length; round++) {
      const restored = result.replace(WORD_TOKEN, (_, index) => kept[Number(index)] ?? "").replace(MARK_TOKEN, (_, digits) => kept[indexOf(digits)] ?? "");
      if (restored === result)
        break;
      result = restored;
    }
    return result;
  }
  function replaceValue(field, next) {
    field.focus();
    field.select();
    try {
      document.execCommand("insertText", false, next);
    } catch {}
    if (field.value !== next) {
      field.value = next;
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  function spaceComposer() {
    const editor = document.querySelector("#reply-control .d-editor-input");
    if (!(editor instanceof HTMLTextAreaElement)) {
      showToast("富文本模式下不能自动混排，请先切换到 Markdown 模式。", "warning", { key: "pangu-composer" });
      return;
    }
    const title = document.querySelector("#reply-control #reply-title");
    let changed = false;
    if (title && !title.disabled && title.value) {
      const next = pangu2.spaceText(title.value);
      if (next !== title.value) {
        replaceValue(title, next);
        changed = true;
      }
    }
    const next = spaceMarkdown(editor.value);
    if (next !== editor.value) {
      replaceValue(editor, next);
      changed = true;
    }
    if (!changed)
      showToast("没有需要加空格的地方。", "info", { key: "pangu-composer" });
  }
  function ensureButton() {
    const create = document.querySelector("#reply-control .save-or-cancel .create");
    if (!create || create.parentElement?.querySelector(`:scope > .${BUTTON}`))
      return;
    const button = mark(h("button", {
      type: "button",
      class: `btn ${BUTTON}`,
      title: "在中文与英文、数字之间加上空格（代码、链接地址保持不变）",
      on: { click: spaceComposer }
    }, h("span", { class: "d-button-label" }, "混排优化")), "pangu-button");
    create.after(button);
  }
  var observer5 = null;
  var flushTimer;
  var pending4 = new Set;
  function addRoot(el) {
    if (!el || el.closest(SKIP2) || isOwnNode(el))
      return;
    pending4.add(el);
  }
  function collect(node) {
    if (node instanceof Element) {
      const root = node.closest(SCOPE);
      if (root)
        addRoot(root);
      else
        for (const inner of node.querySelectorAll(SCOPE))
          addRoot(inner);
    } else if (node.parentElement) {
      addRoot(node.parentElement.closest(SCOPE));
    }
  }
  function flush() {
    flushTimer = undefined;
    for (const root of pending4)
      if (root.isConnected)
        pangu2.spaceNode(root);
    pending4.clear();
    ensureButton();
  }
  function onMutations2(mutations) {
    for (const mutation of mutations) {
      if (mutation.type === "characterData")
        collect(mutation.target);
      else
        for (const node of mutation.addedNodes)
          collect(node);
    }
    flushTimer ??= setTimeout(flush, 100);
  }
  var panguSpacing_default = definePlugin({
    name: "PanguSpacing",
    displayName: "中英文混排优化",
    description: "在帖子正文与标题的中文和英文、数字之间自动加空格；编辑器里的「混排优化」按钮可整理正在写的内容（来自 linuxdo-scripts）。",
    tags: ["reading"],
    icon: LanguagesIcon,
    enabledByDefault: true,
    start() {
      observer5 = new MutationObserver(onMutations2);
      observer5.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
      collect(document.documentElement);
      flush();
    },
    stop() {
      observer5?.disconnect();
      observer5 = null;
      clearTimeout(flushTimer);
      flushTimer = undefined;
      pending4.clear();
      for (const button of document.querySelectorAll(`.${BUTTON}`))
        button.remove();
    }
  });

  // src/plugins/wideLayout/index.ts
  var WIDE_STYLE = "wideLayout-wide";
  var THIN_STYLE = "wideLayout-thinHeader";
  var WIDE_CSS = `#main-outlet-wrapper {
    max-width: 100% !important;
}
body.has-sidebar-page header.d-header > div.wrap {
    max-width: 100% !important;
}
.topic-body {
    width: 100% !important;
}
:root {
    --d-max-width: 100% !important;
}
article .topic-map.--op {
    max-width: 100%;
}
div#reply-control .reply-area {
    width: calc(100% - 2em);
}
@media screen and (min-width: 925px) {
    #main-outlet .container.posts {
        grid-template-columns: auto 120px;
    }
}`;
  var THIN_HEADER_CSS = `.d-header {
    height: 2.5em !important;
}
.d-header .extra-info-wrapper .title-wrapper {
    display: flex;
    flex-direction: row;
}
.d-header div.title-wrapper > h1.header-title {
    width: auto;
    font-size: large;
}
.d-header #site-logo {
    height: 2em !important;
}
.d-header .d-header-icons .icon img.avatar {
    height: 2em !important;
}`;
  var settings16 = definePluginSettings({
    wide: {
      type: 2 /* BOOLEAN */,
      description: "超宽显示：页面内容铺满整个窗口宽度",
      default: true
    },
    thinHeader: {
      type: 2 /* BOOLEAN */,
      description: "窄的顶栏：顶栏高度降为 2.5em，标题与站点图标随之缩小",
      default: true
    }
  });
  function apply() {
    if (settings16.store.wide !== false)
      registerStyle(WIDE_STYLE, WIDE_CSS);
    else
      unregisterStyle(WIDE_STYLE);
    if (settings16.store.thinHeader !== false)
      registerStyle(THIN_STYLE, THIN_HEADER_CSS);
    else
      unregisterStyle(THIN_STYLE);
  }
  var wideLayout_default = definePlugin({
    name: "WideLayout",
    displayName: "超宽显示与窄顶栏",
    description: "页面内容铺满窗口宽度，顶栏变窄，两项可分别开关（来自「LinuxDo自定义\uD83D\uDEE0️」脚本）。",
    tags: ["reading"],
    icon: WideIcon,
    enabledByDefault: true,
    startAt: "Init" /* Init */,
    settings: settings16,
    start: apply,
    stop() {
      unregisterStyle(WIDE_STYLE);
      unregisterStyle(THIN_STYLE);
    },
    onSettingsChange: apply
  });

  // ldpp-css:src/plugins/driveSync/styles.css
  registerStyle("driveSync", `/* Failure statuses quote the request URL; wrap it instead of widening the settings pane. */
.ldpp-drive-status {
    overflow-wrap: anywhere;
}
`);

  // src/plugins/driveSync/client.ts
  var TOKEN_URLS = ["https://oauth2.googleapis.com/token", "https://www.googleapis.com/oauth2/v4/token"];
  var FILE_BASES = ["https://www.googleapis.com/drive/v3/files", "https://content.googleapis.com/drive/v3/files"];
  var UPLOAD_BASES = ["https://www.googleapis.com/upload/drive/v3/files", "https://content.googleapis.com/upload/drive/v3/files"];
  var FOLDER_MIME = "application/vnd.google-apps.folder";
  var TOKEN_MARGIN_MS = 60000;

  class DriveError extends Error {
    status;
    constructor(message, status = 0) {
      super(message);
      this.status = status;
      this.name = "DriveError";
    }
  }
  var quote2 = (value) => `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  function parseJson(res, what) {
    try {
      const json = res.text ? JSON.parse(res.text) : {};
      if (isObject(json))
        return json;
    } catch {
      throw new DriveError(`${what}：返回内容不是 JSON`, res.status);
    }
    throw new DriveError(`${what}：返回内容格式不对`, res.status);
  }

  class DriveClient {
    creds;
    token = "";
    expiresAt = 0;
    constructor(creds) {
      this.creds = creds;
    }
    get configured() {
      return Boolean(this.creds.clientId && this.creds.clientSecret && this.creds.refreshToken);
    }
    async accessToken() {
      if (this.token && Date.now() < this.expiresAt - TOKEN_MARGIN_MS)
        return this.token;
      if (!this.configured)
        throw new DriveError("Google Drive 凭据未填写完整");
      const body = new URLSearchParams({
        client_id: this.creds.clientId,
        client_secret: this.creds.clientSecret,
        refresh_token: this.creds.refreshToken,
        grant_type: "refresh_token"
      }).toString();
      let lastError = null;
      for (const url of TOKEN_URLS) {
        try {
          const res = await httpRequest({ method: "POST", url, headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, credentials: "omit", timeout: 20000 });
          const json = parseJson(res, "获取 Drive 令牌");
          if (!res.ok || typeof json.access_token !== "string")
            throw new DriveError(`获取 Drive 令牌失败：HTTP ${res.status} ${String(json.error_description ?? json.error ?? "")}`.trim(), res.status);
          this.token = json.access_token;
          this.expiresAt = Date.now() + (Number(json.expires_in) || 3600) * 1000;
          return this.token;
        } catch (error) {
          lastError = error;
          if (error instanceof DriveError && error.status >= 400 && error.status < 500)
            throw error;
        }
      }
      throw lastError instanceof Error ? lastError : new DriveError(errorMessage(lastError));
    }
    async call(bases, suffix, init = {}) {
      const token = await this.accessToken();
      let lastError = null;
      for (const base of bases) {
        try {
          const res = await httpRequest({ method: init.method ?? "GET", url: `${base}${suffix}`, headers: { Authorization: `Bearer ${token}`, ...init.headers }, body: init.body, credentials: "omit", timeout: 30000 });
          if (res.ok || init.allow404 && res.status === 404)
            return res;
          if (res.status >= 400 && res.status < 500)
            throw new DriveError(`Drive 请求失败：HTTP ${res.status} ${res.text.slice(0, 300)}`, res.status);
          lastError = new DriveError(`Drive 服务器错误：HTTP ${res.status}`, res.status);
        } catch (error) {
          if (error instanceof DriveError && error.status >= 400 && error.status < 500)
            throw error;
          lastError = error;
        }
      }
      throw lastError instanceof Error ? lastError : new DriveError(errorMessage(lastError));
    }
    async list(query) {
      const files = [];
      let pageToken = "";
      do {
        const params = new URLSearchParams({ q: query, fields: "nextPageToken,files(id,name)", spaces: "drive", pageSize: "1000" });
        if (pageToken)
          params.set("pageToken", pageToken);
        const json = parseJson(await this.call(FILE_BASES, `?${params}`), "列出 Drive 文件");
        for (const file of Array.isArray(json.files) ? json.files : []) {
          if (isObject(file) && typeof file.id === "string")
            files.push({ id: file.id, name: String(file.name ?? "") });
        }
        pageToken = typeof json.nextPageToken === "string" ? json.nextPageToken : "";
      } while (pageToken);
      return files;
    }
    async findOne(name, parent, folder) {
      const clauses = [`name = ${quote2(name)}`, "trashed = false", folder ? `mimeType = ${quote2(FOLDER_MIME)}` : `mimeType != ${quote2(FOLDER_MIME)}`];
      if (parent)
        clauses.push(`${quote2(parent)} in parents`);
      const found = await this.list(clauses.join(" and "));
      if (found.length > 1)
        throw new DriveError(`Drive 中有多个同名${folder ? "文件夹" : "文件"}「${name}」，为避免写错位置已停止同步，请先清理重复项`);
      return found[0]?.id ?? null;
    }
    async ensureFolder(name, parent) {
      const existing = await this.findOne(name, parent, true);
      if (existing)
        return existing;
      const metadata = { name, mimeType: FOLDER_MIME, ...parent ? { parents: [parent] } : {} };
      const json = parseJson(await this.call(FILE_BASES, "?fields=id", { method: "POST", headers: { "Content-Type": "application/json; charset=UTF-8" }, body: JSON.stringify(metadata) }), "创建 Drive 文件夹");
      if (typeof json.id !== "string")
        throw new DriveError("创建 Drive 文件夹失败");
      return json.id;
    }
    async children(parent) {
      return this.list(`${quote2(parent)} in parents and trashed = false`);
    }
    async download(id) {
      const res = await this.call(FILE_BASES, `/${encodeURIComponent(id)}?alt=media`, { allow404: true });
      return res.status === 404 ? null : res.text;
    }
    async upload(name, parent, content, id) {
      const boundary = `ldpp${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
      const metadata = id ? { name } : { name, parents: [parent], mimeType: "application/json" };
      const body = [
        `--${boundary}`,
        "Content-Type: application/json; charset=UTF-8",
        "",
        JSON.stringify(metadata),
        `--${boundary}`,
        "Content-Type: application/json; charset=UTF-8",
        "",
        content,
        `--${boundary}--`
      ].join(`\r
`);
      const suffix = id ? `/${encodeURIComponent(id)}?uploadType=multipart&fields=id` : "?uploadType=multipart&fields=id";
      const json = parseJson(await this.call(UPLOAD_BASES, suffix, { method: id ? "PATCH" : "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body }), "上传 Drive 文件");
      return typeof json.id === "string" ? json.id : id ?? "";
    }
  }

  // src/plugins/driveSync/sync.ts
  var INDEX_FILE = "summary-index.v2.json";
  var DEARROW_FILE = "dearrow-state.v1.json";
  var LEGACY_FILE = "总结内容 - [LINUX DO] \uD83C\uDF1F 主题 & 回复 总结.json";
  var TOPICS_FOLDER = "topics";
  var SHARD_VERSION = 3;
  var DEARROW_VERSION = 1;
  var SHARD_NAME = /^topic-(.+)\.json$/;
  var DIRTY_KEY = "LDPP.driveDirty";
  var DEARROW_DIRTY_KEY = "LDPP.driveDeArrowDirty";
  var shardName = (topicId) => `topic-${topicId}.json`;
  var parse = (text) => {
    if (!text?.trim())
      return null;
    try {
      return JSON.parse(text);
    } catch {
      throw new DriveError("Drive 中的文件不是有效 JSON");
    }
  };
  function normalizeIndex(raw) {
    const index = { version: SHARD_VERSION, updatedAt: new Date().toISOString(), topics: {} };
    if (!isObject(raw) || !isObject(raw.topics))
      return index;
    for (const [id, value] of Object.entries(raw.topics)) {
      if (!isObject(value) || !id.trim())
        continue;
      index.topics[id.trim()] = {
        fileName: typeof value.fileName === "string" && value.fileName ? value.fileName : shardName(id.trim()),
        fileId: typeof value.fileId === "string" ? value.fileId : "",
        updatedAt: String(value.updatedAt ?? ""),
        entryCount: Number(value.entryCount ?? value.itemCount) || 0,
        questionCount: Number(value.questionCount) || 0,
        latestTimestamp: String(value.latestTimestamp ?? ""),
        latestQuestionTimestamp: String(value.latestQuestionTimestamp ?? "")
      };
    }
    return index;
  }
  function parseShard(raw) {
    if (Array.isArray(raw))
      return { history: normalizeSummaryList(raw), questionHistory: [] };
    if (!isObject(raw))
      return { history: [], questionHistory: [] };
    return { history: normalizeSummaryList(raw.history ?? raw.items), questionHistory: normalizeQAList(raw.questionHistory) };
  }
  function parseDeArrowPayload(raw) {
    if (!isObject(raw))
      throw new DriveError("Drive 中的 DeArrow 状态文件格式不对，已停止覆盖");
    const version = Number(raw.version);
    if (!Number.isInteger(version) || version < 1)
      throw new DriveError("Drive 中的 DeArrow 状态缺少版本号，已停止覆盖");
    if (version > DEARROW_VERSION)
      throw new DriveError(`Drive 中的 DeArrow 状态版本 ${version} 比当前支持的更新，已停止覆盖`);
    return normalizeDeArrowMap(raw.topics ?? raw.states);
  }
  function indexEntry(topicId, payload, fileId) {
    return {
      fileName: shardName(topicId),
      fileId,
      updatedAt: new Date().toISOString(),
      entryCount: payload.history.length,
      questionCount: payload.questionHistory.length,
      latestTimestamp: payload.history[0]?.timestamp ?? "",
      latestQuestionTimestamp: payload.questionHistory[0]?.timestamp ?? ""
    };
  }
  function loadDirty() {
    const raw = gmGet(DIRTY_KEY, []);
    return new Set(Array.isArray(raw) ? raw.map(String) : []);
  }
  function saveDirty(dirty) {
    gmSet(DIRTY_KEY, Array.from(dirty));
  }
  function loadDeArrowDirty() {
    return gmGet(DEARROW_DIRTY_KEY, false) === true;
  }
  function saveDeArrowDirty(value) {
    gmSet(DEARROW_DIRTY_KEY, value);
  }

  class DriveSync {
    client;
    folderName;
    root = null;
    topics = null;
    constructor(client, folderName) {
      this.client = client;
      this.folderName = folderName;
    }
    async rootFolder(create) {
      if (this.root)
        return this.root;
      this.root = create ? await this.client.ensureFolder(this.folderName, null) : await this.client.findOne(this.folderName, null, true);
      return this.root;
    }
    async topicsFolder(create) {
      if (this.topics)
        return this.topics;
      const root = await this.rootFolder(create);
      if (!root)
        return null;
      this.topics = create ? await this.client.ensureFolder(TOPICS_FOLDER, root) : await this.client.findOne(TOPICS_FOLDER, root, true);
      return this.topics;
    }
    async loadIndex() {
      const root = await this.rootFolder(false);
      if (!root)
        return { index: normalizeIndex(null), fileId: null, readable: true };
      const fileId = await this.client.findOne(INDEX_FILE, root, false);
      const raw = fileId ? parse(await this.client.download(fileId)) : null;
      return { index: normalizeIndex(raw), fileId, readable: !fileId || isObject(raw) && isObject(raw.topics) };
    }
    async readShard(topicId, entry) {
      const folder = await this.topicsFolder(false);
      let fileId = entry?.fileId || null;
      let text = fileId ? await this.client.download(fileId) : null;
      if (text === null && folder) {
        fileId = await this.client.findOne(entry?.fileName || shardName(topicId), folder, false);
        text = fileId ? await this.client.download(fileId) : null;
      }
      return { payload: parseShard(parse(text)), fileId: text === null ? null : fileId };
    }
    async readLegacy() {
      const root = await this.rootFolder(false);
      if (!root)
        return {};
      const fileId = await this.client.findOne(LEGACY_FILE, root, false);
      const raw = fileId ? parse(await this.client.download(fileId)) : null;
      const out = {};
      if (!isObject(raw))
        return out;
      for (const [id, list] of Object.entries(raw)) {
        const items = normalizeSummaryList(list);
        if (items.length)
          out[id] = items;
      }
      return out;
    }
    async pullTopic(topicId) {
      const { index } = await this.loadIndex();
      let { payload } = await this.readShard(topicId, index.topics[topicId]);
      if (!payload.history.length) {
        const legacy = (await this.readLegacy())[topicId] ?? [];
        payload = { history: legacy, questionHistory: payload.questionHistory };
      }
      this.mergeIntoLocal(topicId, payload);
      return payload.history.length > 0;
    }
    async pullQuestions(topicId) {
      const { index } = await this.loadIndex();
      if (!index.topics[topicId])
        return;
      const { payload } = await this.readShard(topicId, index.topics[topicId]);
      if (payload.questionHistory.length)
        this.mergeIntoLocal(topicId, { history: [], questionHistory: payload.questionHistory });
    }
    mergeIntoLocal(topicId, payload) {
      if (payload.history.length) {
        const local = Summaries.get(topicId) ?? [];
        const merged = mergeSummaries(local, payload.history);
        if (merged.length !== local.length)
          Summaries.set(topicId, merged, "drive");
        if (!Summarized.has(topicId))
          Summarized.set(topicId, true, "drive");
      }
      if (payload.questionHistory.length) {
        const local = Questions.get(topicId) ?? [];
        const merged = mergeQA(local, payload.questionHistory);
        if (merged.length !== local.length)
          Questions.set(topicId, merged, "drive");
      }
    }
    async pullDeArrow() {
      const root = await this.rootFolder(false);
      if (!root)
        return 0;
      const fileId = await this.client.findOne(DEARROW_FILE, root, false);
      const text = fileId ? await this.client.download(fileId) : null;
      if (!text?.trim())
        return 0;
      const remote = parseDeArrowPayload(parse(text));
      return this.applyDeArrow(remote);
    }
    applyDeArrow(remote) {
      const local = DeArrowStates.all();
      const merged = mergeDeArrowMaps(local, remote);
      const changed = {};
      for (const [id, state] of Object.entries(merged))
        if (JSON.stringify(local[id]) !== JSON.stringify(state))
          changed[id] = state;
      DeArrowStates.setMany(changed, "drive");
      return Object.keys(changed).length;
    }
    async pushDeArrow() {
      const root = await this.rootFolder(true);
      if (!root)
        return 0;
      const fileId = await this.client.findOne(DEARROW_FILE, root, false);
      const text = fileId ? await this.client.download(fileId) : null;
      if (fileId && text !== null && !text.trim())
        throw new DriveError("Drive 中的 DeArrow 状态文件为空，已停止覆盖");
      const remote = text?.trim() ? parseDeArrowPayload(parse(text)) : {};
      const merged = mergeDeArrowMaps(DeArrowStates.all(), remote);
      await this.client.upload(DEARROW_FILE, root, JSON.stringify({ version: DEARROW_VERSION, updatedAt: new Date().toISOString(), topics: merged }, null, 2), fileId);
      this.applyDeArrow(merged);
      return Object.keys(merged).length;
    }
    async pushTopics(topicIds, onProgress) {
      if (!topicIds.length)
        return [];
      const root = await this.rootFolder(true);
      const folder = await this.topicsFolder(true);
      if (!root || !folder)
        throw new DriveError("无法创建 Drive 同步文件夹");
      const { index, fileId: indexId, readable } = await this.loadIndex();
      if (!readable)
        throw new DriveError(`Drive 中的 ${INDEX_FILE} 为空或格式无法识别，已停止覆盖`);
      const done = [];
      let legacy = null;
      for (const topicId of topicIds) {
        const remote = await this.readShard(topicId, index.topics[topicId]);
        const remoteHistory = remote.payload.history.length ? remote.payload.history : (legacy ??= await this.readLegacy())[topicId] ?? [];
        const payload = {
          history: mergeSummaries(remoteHistory, Summaries.get(topicId) ?? []),
          questionHistory: mergeQA(remote.payload.questionHistory, Questions.get(topicId) ?? [])
        };
        if (!payload.history.length && !payload.questionHistory.length) {
          done.push(topicId);
          continue;
        }
        const body = JSON.stringify({ version: SHARD_VERSION, topicId, updatedAt: new Date().toISOString(), ...payload }, null, 2);
        const fileId = await this.client.upload(shardName(topicId), folder, body, remote.fileId);
        index.topics[topicId] = indexEntry(topicId, payload, fileId);
        this.mergeIntoLocal(topicId, payload);
        done.push(topicId);
        onProgress?.(done.length, topicIds.length);
      }
      index.version = SHARD_VERSION;
      index.updatedAt = new Date().toISOString();
      await this.client.upload(INDEX_FILE, root, JSON.stringify(index, null, 2), indexId);
      return done;
    }
    async remoteTopicIds() {
      const ids = new Set;
      const { index } = await this.loadIndex();
      for (const [id, entry] of Object.entries(index.topics))
        if (entry.entryCount > 0)
          ids.add(id);
      const folder = await this.topicsFolder(false);
      if (folder)
        for (const file of await this.client.children(folder)) {
          const id = file.name.match(SHARD_NAME)?.[1];
          if (id)
            ids.add(id);
        }
      for (const id of Object.keys(await this.readLegacy()))
        ids.add(id);
      return Array.from(ids);
    }
  }

  // src/plugins/driveSync/index.ts
  var logger14 = new Logger("DriveSync", "#89b4fa");
  var DEFAULT_FOLDER = "[LINUX DO] \uD83C\uDF1F 话题 & 回复 总结";
  var AUTO_DELAY_MS = 3000;
  var settings17 = definePluginSettings({
    clientId: {
      type: 0 /* STRING */,
      description: "OAuth Client ID",
      placeholder: "xxxx.apps.googleusercontent.com",
      default: ""
    },
    clientSecret: {
      type: 0 /* STRING */,
      description: "OAuth Client Secret",
      secret: true,
      default: ""
    },
    refreshToken: {
      type: 0 /* STRING */,
      description: "Refresh Token",
      secret: true,
      default: ""
    },
    folderName: {
      type: 0 /* STRING */,
      description: "Drive 同步文件夹名称",
      default: DEFAULT_FOLDER
    },
    autoSync: {
      type: 2 /* BOOLEAN */,
      description: "本地总结 / 问答 / DeArrow 状态变化后自动上传。",
      default: true
    },
    panel: {
      type: 5 /* COMPONENT */,
      description: "同步操作",
      render: () => renderPanel2()
    }
  });
  var dirty = new Set;
  var dearrowDirty = false;
  var timer3 = null;
  var running2 = null;
  var queued = false;
  var status = "尚未同步";
  var cached = null;
  var statusListeners = new Set;
  var unsubs3 = [];
  function client() {
    const { clientId, clientSecret, refreshToken } = settings17.store;
    const key = `${clientId}\x00${clientSecret}\x00${refreshToken}`;
    if (cached?.key !== key)
      cached = { key, client: new DriveClient({ clientId, clientSecret, refreshToken }) };
    return cached.client;
  }
  function engine() {
    return new DriveSync(client(), settings17.store.folderName.trim() || DEFAULT_FOLDER);
  }
  function setStatus(text) {
    status = text;
    for (const listener of Array.from(statusListeners))
      listener();
  }
  function pendingText() {
    const parts = [dirty.size ? `${dirty.size} 个话题` : "", dearrowDirty ? "DeArrow 状态" : ""].filter(Boolean);
    return parts.length ? `待上传：${parts.join(" + ")}` : "没有待上传的变更";
  }
  async function runSync(manual) {
    if (!client().configured) {
      setStatus("凭据未填写完整");
      if (manual)
        showToast("请先填写 Google Drive 凭据", "warning");
      return;
    }
    if (running2) {
      queued = true;
      return running2;
    }
    running2 = (async () => {
      const sync = engine();
      try {
        let dearrowCount = 0;
        if (dearrowDirty) {
          setStatus("正在同步 DeArrow 状态…");
          dearrowDirty = false;
          saveDeArrowDirty(false);
          dearrowCount = await sync.pushDeArrow();
        }
        const ids = Array.from(dirty);
        if (ids.length) {
          const done = await sync.pushTopics(ids, (count, total) => setStatus(`正在上传话题 ${count}/${total}…`));
          for (const id of done)
            dirty.delete(id);
          saveDirty(dirty);
        }
        setStatus(`${new Date().toLocaleTimeString()} 同步完成：话题 ${ids.length} 个${dearrowCount ? `，DeArrow ${dearrowCount} 条` : ""}`);
        if (manual)
          showToast("Google Drive 同步完成", "success");
      } catch (error) {
        logger14.error("同步失败", error);
        setStatus(`同步失败：${errorMessage(error)}`);
        if (manual)
          showToast(`Drive 同步失败：${errorMessage(error)}`, "error");
        else
          showToast(`Drive 自动同步失败：${errorMessage(error)}`, "error", { key: "drive-sync" });
      }
    })().finally(() => {
      running2 = null;
      if (queued) {
        queued = false;
        scheduleSync();
      }
    });
    return running2;
  }
  function scheduleSync() {
    if (!settings17.store.autoSync || !client().configured || !dirty.size && !dearrowDirty)
      return;
    if (timer3)
      clearTimeout(timer3);
    timer3 = setTimeout(() => {
      timer3 = null;
      runSync(false);
    }, AUTO_DELAY_MS);
  }
  async function rebuildSummarized() {
    setStatus("正在从 Drive 读取已总结话题…");
    try {
      const ids = await engine().remoteTopicIds();
      Summarized.setMany(Object.fromEntries(ids.map((id) => [id, true])), "drive");
      setStatus(`已标记 ${ids.length} 个云端已总结话题`);
      showToast(`已从 Drive 标记 ${ids.length} 个已总结话题`, "success");
    } catch (error) {
      setStatus(`重建失败：${errorMessage(error)}`);
      showToast(`重建失败：${errorMessage(error)}`, "error");
    }
  }
  async function testConnection() {
    setStatus("正在测试连接…");
    try {
      const root = await engine().rootFolder(false);
      setStatus(root ? "连接成功，已找到同步文件夹" : "连接成功，Drive 中还没有同步文件夹（首次上传时自动创建）");
    } catch (error) {
      setStatus(`连接失败：${errorMessage(error)}`);
    }
  }
  function renderPanel2() {
    const line = h("p", { class: "ldpp-drive-status" });
    const pending = h("p", { class: "ldpp-muted" });
    const update = () => {
      line.textContent = status;
      pending.textContent = pendingText();
    };
    statusListeners.add(update);
    update();
    return h("div", { class: "ldpp-drive-panel" }, h("div", { class: "ldpp-row-actions" }, Button("立即同步", { kind: "primary", small: true, icon: CloudIcon(14), onClick: () => void runSync(true).then(update) }), Button("测试连接", { small: true, onClick: () => void testConnection() }), Button("从云端重建「已总结」标记", { small: true, onClick: () => void rebuildSummarized() }), InfoTip("需要在 Google Cloud 控制台为 Drive API 创建 OAuth 客户端，并用 drive.file（或 drive）权限换取 Refresh Token。文件夹布局与旧版总结脚本一致，可直接接续旧数据。")), line, pending);
  }
  var driveSync_default = definePlugin({
    name: "DriveSync",
    displayName: "Google Drive 同步",
    description: "把总结、问答与 DeArrow 状态同步到你自己的 Google Drive，多设备共享；本地缺失时自动从云端拉取。",
    tags: ["sync"],
    icon: CloudIcon,
    settings: settings17,
    start() {
      dirty = loadDirty();
      dearrowDirty = loadDeArrowDirty();
      unsubs3.push(subscribe("dataChange", ({ store, ids, source }) => {
        if (source !== "local" && source !== "import")
          return;
        if (store === "summaries" || store === "questions") {
          for (const id of ids)
            dirty.add(id);
          saveDirty(dirty);
        } else if (store === "dearrow") {
          dearrowDirty = true;
          saveDeArrowDirty(true);
        } else {
          return;
        }
        statusListeners.forEach((listener) => listener());
        scheduleSync();
      }), registerRemoteSource(async (topicId) => client().configured && engine().pullTopic(topicId)), registerQuestionSource(async (topicId) => {
        if (client().configured)
          await engine().pullQuestions(topicId);
      }));
      if (client().configured) {
        engine().pullDeArrow().then((count) => {
          if (count)
            logger14.info(`从 Drive 合并了 ${count} 条 DeArrow 状态`);
        }, (error) => logger14.warn("拉取 DeArrow 状态失败", error));
      }
      scheduleSync();
    },
    stop() {
      if (timer3)
        clearTimeout(timer3);
      timer3 = null;
      for (const unsub of unsubs3.splice(0))
        unsub();
    }
  });

  // ldpp-virtual:~plugins
  var __plugins_default = { [ai_default.name]: ai_default, [notifications_default.name]: notifications_default, [settings_default.name]: settings_default, [userStyles_default.name]: userStyles_default, [topicSummary_default.name]: topicSummary_default, [disableAutoplay_default.name]: disableAutoplay_default, [listSummary_default.name]: listSummary_default, [sidebarWidth_default.name]: sidebarWidth_default, [createdTime_default.name]: createdTime_default, [topicBlocker_default.name]: topicBlocker_default, [deArrow_default.name]: deArrow_default, [posterAvatars_default.name]: posterAvatars_default, [noWatermark_default.name]: noWatermark_default, [customGreeting_default.name]: customGreeting_default, [searchFilter_default.name]: searchFilter_default, [panguSpacing_default.name]: panguSpacing_default, [topicQA_default.name]: topicQA_default, [wideLayout_default.name]: wideLayout_default, [driveSync_default.name]: driveSync_default, [keywordSearch_default.name]: keywordSearch_default };

  // src/LDPP.ts
  var logger15 = new Logger("Core", "#f9d77e");
  var initialized = false;
  var version = "[20261023.4] v1.0.0";
  function init() {
    if (initialized)
      return;
    initialized = true;
    initSettings();
    initDataStores();
    for (const plugin of Object.values(__plugins_default))
      registerPlugin(plugin);
    startAllPlugins("Init" /* Init */);
    onReady(() => {
      startNavigation();
      startTopicList();
      startAllPlugins("DOMContentLoaded" /* DOMContentLoaded */);
      logger15.info(`LD++ ${"[20261023.4] v1.0.0"} 已加载，${Object.keys(__plugins_default).length} 个模块`);
    });
  }

  // src/index.ts
  var host2 = pageWindow;
  if (window === window.top && !host2.LDPP) {
    Object.defineProperty(host2, "LDPP", { value: exports_LDPP, configurable: true, writable: false });
    try {
      init();
    } catch (error) {
      console.error("[LD++] 初始化失败", error);
    }
  }
})();
