// src/lib/languageTemplates.js
export const templates = {
    python:
      "import sys\n\n# Read all input tokens\n# Example: a, b = map(int, sys.stdin.read().split())\n# TODO: compute and print the result\n# print(result)\n",
    java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // TODO: read input and System.out.println the answer\n    }\n}\n`,
    ruby:
      "data = STDIN.read.split\n# TODO: parse and puts the required output\n# puts result\n",
  };
  