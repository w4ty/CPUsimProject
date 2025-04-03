vars = ["AX", "BX", "CX", "DX", "BP", "DI", "SI", "DISP"];
let SP = 0xfffe;
stack = {};
let darkmodeCookie = document.cookie.replace(
  /(?:(?:^|.*;\s*)darkmode\s*\=\s*([^;]*).*$)|^.*$/,
  "$1"
);
if (darkmodeCookie == "true") toggleDarkMode();

let languageCookie = document.cookie.replace(
    /(?:(?:^|.*;\s*)language\s*\=\s*([^;]*).*$)|^.*$/,
    "$1"
);
if (languageCookie) {
    setLanguage(languageCookie);
}

if (
  document.getElementById("commands").value == "PUSH" ||
  document.getElementById("commands").value == "POP"
) {
  toggleSecondArg(false);
}

for (let i = 0; i < vars.length; i++) {
  vars[`${vars[i]}`] = "0000";
}

memory = {};
hexRegex = /^[0-9a-fA-F]{4}$/;
namingRegex = /^[A-Z]+$/;
function setOperationMessage(message) {
  document.getElementById("operation_return").innerHTML += message + "<br>";
}
function updateGUI() {
  document.getElementById("table_input_0").value = vars["AX"];
  document.getElementById("table_input_1").value = vars["BX"];
  document.getElementById("table_input_2").value = vars["CX"];
  document.getElementById("table_input_3").value = vars["DX"];
  document.getElementById("table_input_4").value = vars["BP"];
  document.getElementById("table_input_5").value = vars["DI"];
  document.getElementById("table_input_6").value = vars["SI"];
  document.getElementById("table_input_7").value = vars["DISP"];
  document.getElementById("memory_return").innerHTML = JSON.stringify(memory)
    .replace("{", "")
    .replace("}", "")
    .replaceAll('"', "")
    .replaceAll(",", "<br>")
    .toUpperCase();

  let stackDisplay = "";
  for (let key in stack) {
    if (stack.hasOwnProperty(key)) {
      stackDisplay += `${parseInt(key, 10)
        .toString(16)
        .toUpperCase()
        .padStart(4, "0")}: ${stack[key]}<br>`;
    }
  }
  document.getElementById("stack_return").innerHTML = stackDisplay;
  document.getElementById("stack_pointer").innerHTML = SP.toString(16)
    .toUpperCase()
    .padStart(4, "0");

  document.querySelectorAll(".autoscroll").forEach((element) => {
    element.scrollTop = element.scrollHeight;
  });
}
function runCommand(operation, argFirst, argSecond) {
  let valid = false;
  let invalidArg = argFirst;

  if (
    typeof vars[`${argFirst}`] !== "undefined" &&
    namingRegex.test(argFirst)
  ) {
    if (operation == "MOV") {
      if (
        !namingRegex.test(argSecond) &&
        !hexRegex.test(argSecond) &&
        !checkIfPointer(argSecond)
      ) {
        console.log(`BAD SECOND ARG`);
        invalidArg = argSecond;
      } else {
        if (checkIfPointer(argSecond)) {
          let memoryAddress = hexMath(argSecond);
          if (hexRegex.test(memoryAddress)) {
            let lowByte = memory[`${memoryAddress}`] || "00";
            let highByte =
              memory[
                `${(parseInt(memoryAddress, 16) + 1)
                  .toString(16)
                  .padStart(4, "0")}`
              ] || "00";
            vars[`${argFirst}`] = highByte + lowByte;
            valid = true;
          } else {
            invalidArg = argSecond;
          }
        } else {
          vars[`${argFirst}`] =
            typeof vars[`${argSecond}`] !== "undefined"
              ? vars[`${argSecond}`]
              : hexRegex.test(argSecond)
              ? argSecond
              : "0000";
          valid = true;
        }
      }
    } else if (operation == "XCHG") {
      if (
        checkIfPointer(argSecond) &&
        typeof memory[`${hexMath(argSecond)}`] !== "undefined"
      ) {
        console.log(argSecond + " is pointer");
        let memoryAddress = hexMath(argSecond);
        let temp = vars[`${argFirst}`];
        let lowByte = memory[`${memoryAddress}`] || "00";
        let highByte =
          memory[
            `${(parseInt(memoryAddress, 16) + 1).toString(16).padStart(4, "0")}`
          ] || "00";
        memory[`${memoryAddress}`] = temp.slice(2, 4);
        memory[
          `${(parseInt(memoryAddress, 16) + 1).toString(16).padStart(4, "0")}`
        ] = temp.slice(0, 2);
        vars[`${argFirst}`] = highByte + lowByte;
        valid = true;
      } else if (
        !namingRegex.test(argSecond) ||
        typeof vars[`${argSecond}`] === "undefined"
      ) {
        invalidArg = argSecond;
      } else {
        console.log(`${argSecond} is not pointer and is var`);
        let temp = vars[`${argFirst}`];
        vars[`${argFirst}`] = vars[`${argSecond}`];
        vars[`${argSecond}`] = temp;
        valid = true;
      }
    }
    if (operation == "PUSH") {
      SP -= 2;
      let value = vars[`${argFirst}`];
      stack[SP] = value.slice(2, 4);
      stack[SP + 1] = value.slice(0, 2);
      valid = true;
      setOperationMessage(`${operation} ${argFirst}`);
    } else if (operation == "POP") {
      if (Object.keys(stack).length > 0) {
        let highByte = stack[SP + 1];
        let lowByte = stack[SP];
        vars[`${argFirst}`] = highByte + lowByte;
        delete stack[SP];
        delete stack[SP + 1];
        SP += 2;
        valid = true;
        setOperationMessage(`${operation} ${argFirst}`);
      } else {
        setOperationMessage(`EMPTY STACK`);
      }
    } else {
      setOperationMessage(`${operation} ${argFirst}, ${argSecond}`);
    }
    updateGUI();
  } else if (checkIfPointer(argFirst)) {
    let memoryAddress = hexMath(argFirst);
    if (hexRegex.test(memoryAddress)) {
      if (operation == "MOV") {
        if (
          !namingRegex.test(argSecond) &&
          !hexRegex.test(argSecond) &&
          !checkIfPointer(argSecond)
        ) {
          console.log(`BAD SECOND ARG`);
          invalidArg = argSecond;
        } else {
          let value =
            typeof vars[`${argSecond}`] !== "undefined"
              ? vars[`${argSecond}`]
              : hexRegex.test(argSecond)
              ? argSecond
              : "0000";
          memory[`${memoryAddress}`] = value.slice(2, 4);
          memory[
            `${(parseInt(memoryAddress, 16) + 1).toString(16).padStart(4, "0")}`
          ] = value.slice(0, 2);
          valid = true;
        }
      } else if (operation == "XCHG") {
        if (typeof memory[`${memoryAddress}`] === "undefined") {
          invalidArg = argSecond;
        } else {
          let tempLowByte = memory[`${memoryAddress}`];
          let tempHighByte =
            memory[
              `${(parseInt(memoryAddress, 16) + 1)
                .toString(16)
                .padStart(4, "0")}`
            ];
          if (checkIfPointer(argSecond)) {
            let secondMemoryAddress = hexMath(argSecond);
            if (hexRegex.test(secondMemoryAddress)) {
              memory[`${memoryAddress}`] = memory[`${secondMemoryAddress}`];
              memory[
                `${(parseInt(memoryAddress, 16) + 1)
                  .toString(16)
                  .padStart(4, "0")}`
              ] =
                memory[
                  `${(parseInt(secondMemoryAddress, 16) + 1)
                    .toString(16)
                    .padStart(4, "0")}`
                ];
              memory[`${secondMemoryAddress}`] = tempLowByte;
              memory[
                `${(parseInt(secondMemoryAddress, 16) + 1)
                  .toString(16)
                  .padStart(4, "0")}`
              ] = tempHighByte;
              valid = true;
            } else {
              invalidArg = argSecond;
            }
          } else {
            let lowByte = vars[`${argSecond}`].slice(2, 4);
            let highByte = vars[`${argSecond}`].slice(0, 2);
            memory[`${memoryAddress}`] = lowByte;
            memory[
              `${(parseInt(memoryAddress, 16) + 1)
                .toString(16)
                .padStart(4, "0")}`
            ] = highByte;
            vars[`${argSecond}`] = tempHighByte + tempLowByte;
            valid = true;
          }
        }
      }
      setOperationMessage(`${operation} ${argFirst}, ${argSecond}`);
      updateGUI();
    } else {
      setOperationMessage(`INVALID MEMORY ADDRESS \"${memoryAddress}\"`);
    }
  }
  if (!valid) setOperationMessage(`INVALID ARGUMENT \"${invalidArg}\"`);
}

function checkIfPointer(arg) {
  return arg.slice(0, 1) === "[" && arg.slice(-1) === "]";
}

function hexMath(calculation) {
  calculation = calculation
    .replaceAll(" ", "")
    .replaceAll("[", "")
    .replaceAll("]", "");
  components = calculation.split("+");
  let sum = 0;

  for (let i = 0; i < components.length; i++) {
    if (
      typeof vars[`${components[i]}`] !== "undefined" &&
      namingRegex.test(components[i])
    ) {
      components[i] = vars[`${components[i]}`];
    }
    sum += parseInt(components[i], 16);
  }
  return sum.toString(16).toUpperCase().padStart(4, "0");
}
function setTable(tableId, mode = 0) {
  switch (mode) {
    case 0:
      for (let i = tableId * 4; i < tableId * 4 + 4; i++) {
        runCommand("MOV", `${vars[i]}`, "0000");
      }
      break;
    case 1:
      for (let i = tableId * 4; i < tableId * 4 + 4; i++) {
        runCommand(
          "MOV",
          `${vars[i]}`,
          Math.floor(Math.random() * 65535)
            .toString(16)
            .toUpperCase()
            .padStart(4, "0")
        );
      }
      break;
    case 2:
      let values = [];
      let val = 0;
      let result = 0;
      for (let i = tableId * 4; i < tableId * 4 + 4; i++) {
        val = document.getElementById(`table_input_${i}`).value;
        console.log(i + " " + val);
        result = hexRegex.test(val.padStart(4, "0"))
          ? val.padStart(4, "0")
          : "0000";
        console.log(result);
        values.push(result);
      }
      for (let i = tableId * 4; i < tableId * 4 + 4; i++) {
        runCommand("MOV", `${vars[i]}`, values[i - tableId * 4]);
      }
      break;
  }
}

function insertVariableToInput(inputId, selectorId, isPointer = false) {
  if (
    document.getElementById(`${selectorId}`).value !== "Wybierz tryb adresacji"
  )
    document.getElementById(`${inputId}`).value = `${isPointer ? "[" : ""}${
      document.getElementById(`${selectorId}`).value
    }${isPointer ? "+DISP]" : ""}`;
}

function swapInputOrder() {
  let temp = document.getElementById("arg_first").value;
  document.getElementById("arg_first").value =
    document.getElementById("arg_second").value;
  document.getElementById("arg_second").value = temp;
}

function updateMemoryRegSelection(mode) {
  options = {};
  console.log(mode);

  let memoryRegSelection = document.getElementById("memory_reg_selection");
  memoryRegSelection.innerHTML = "";

  switch (mode) {
    case "Indeksowy":
      console.log("Indeksowy");
      options = { DI: "DI", SI: "SI" };
      break;
    case "Bazowy":
      options = { BX: "BX", BP: "BP" };
      break;
    case "Indeksowo-bazowy":
      options = {
        "SI+BX": "SI+BX",
        "SI+BP": "SI+BP",
        "DI+BX": "DI+BX",
        "DI+BP": "DI+BP",
      };
      break;
    default:
      options = { "Wybierz tryb adresacji": "Wybierz tryb adresacji" };
      break;
  }
  console.log(options.length);
  for (let key in options) {
    if (options.hasOwnProperty(key)) {
      let option = document.createElement("option");
      option.value = key;
      option.text = options[key];
      memoryRegSelection.add(option);
    }
  }
}

function toggleSecondArg(on) {
  document.getElementById("arg_second").disabled = !on;
}

function clearObject(object, name = "") {
  for (var member in object) delete object[member];
  setOperationMessage(`CLEARED ${name}`);
  updateGUI();
}

function clearOperationLog() {
  document.getElementById("operation_return").innerHTML = "";
  updateGUI();
}

function resetStackPointer() {
  SP = 0xfffe;
  updateGUI();
}

function toggleManual() {
  let manualDiv = document.querySelector(".manual-div");
  let manualBackground = document.querySelector(".manual-background");
  manualDiv.classList.toggle("display-none");
  manualBackground.classList.toggle("display-none");
}

function toggleDarkMode() {
  let body = document.querySelector("body");
  body.classList.toggle("dark-mode");
  let now = new Date();
  now.setMonth(now.getMonth() + 1);
  document.cookie =
    "darkmode=" +
    body.classList.contains("dark-mode") +
    ";expires=" +
    now.toUTCString();
}

function setLanguage(language) {
    console.log(language);
    let now = new Date();
    now.setMonth(now.getMonth() + 1);
    document.cookie +=
        "language=" +
        language +
        ";expires=" +
        now.toUTCString();
    let fileToFetch = `./localization/${language}.json`;
    fetch(fileToFetch)
        .then(response => response.json())
        .then(data => {
            let translations = data;
            document.querySelectorAll("[id^='loc_']").forEach(element => {
                let key = element.id;
                if (translations[key]) {
                    element.innerHTML = translations[key];
                }
            });
        })
        .catch(error => console.error('Error loading translations:', error));

}

console.log(vars);
updateGUI();
setLanguage("pl");
