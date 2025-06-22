export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  generateToolDescriptions(): string {
    return Array.from(this.tools.values())
      .map((tool) => {
        const params = tool.parameters
          .map((p) => `${p.name} (${p.type})${p.required ? " - required" : ""}`)
          .join(", ");
        return `- ${tool.name}: ${tool.description}\n  Parameters: ${params}`;
      })
      .join("\n");
  }

  generateToolSchemaPrompt(): string {
    const tools = this.getAllTools();
    return tools
      .map((tool) => {
        const params = tool.parameters
          .map(
            (p) =>
              `${p.name}: ${p.type} - ${p.description} [${
                p.required ? "required" : "optional"
              }]`
          )
          .join(", ");
        return `- ${tool.name}: ${tool.description} Arguments: { ${params} }`;
      })
      .join("\n");
  }

  async executeTool(name: string, params: Record<string, unknown>) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    return await tool.execute(params);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  getToolCount(): number {
    return this.tools.size;
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

export const toolRegistry = new ToolRegistry();
