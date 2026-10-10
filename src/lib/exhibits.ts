/** Technical guides distilled from primary documentation; not personal project claims. */
export const exhibits = [
  { id: 'ai-agents', name: 'AI 智能体', en: 'AI Agents', number: '01', kind: 'AGENTS', wall: 'AI AGENTS', accent: '#86c8d6',
    source: 'LangGraph', sourceUrl: 'https://docs.langchain.com/oss/python/langgraph/overview',
    summary: '以 LangGraph 的有状态工作流为参考，把智能体理解为可执行、可恢复、可人工介入的任务图。', summaryEn: 'A guide to stateful agent workflows: execution, recovery and human oversight, informed by LangGraph.',
    subtitle: '从理解任务，到完成任务。', subtitleEn: 'From understanding a task to taking action.',
    topics: [
      ['状态与任务图', 'State & task graphs', '将模型推理、工具调用和确定性步骤组织成任务图，让流程中的状态与转移关系清晰可见。', 'Connect model reasoning, tool calls and deterministic steps through explicit state and graph transitions.'],
      ['持久化与恢复', 'Persistence & recovery', '持久化保存工作流状态，使长任务能够从中断位置继续，而不必从头开始。记忆可分为会话内状态与跨会话信息。', 'Persist workflow state to resume interrupted tasks. Separate session state from information retained across sessions.'],
      ['人工介入', 'Human oversight', '在关键节点暂停执行，供人检查、修改状态或确认下一步，再恢复任务。把可控性放进流程本身。', 'Pause at important steps for inspection, state changes or approval, then resume the workflow.'],
    ],
  },
  { id: 'ai-infra', name: 'AI Infra', en: 'AI Infrastructure', number: '02', kind: 'INFRA', wall: 'AI INFRA', accent: '#e3b879',
    source: 'vLLM', sourceUrl: 'https://docs.vllm.ai/en/latest/',
    summary: '以 vLLM 的推理服务为参考，从内存管理、请求调度到分布式执行，理解模型服务背后的工程链路。', summaryEn: 'Explore the engineering behind model serving through vLLM: memory management, request scheduling and distributed execution.',
    subtitle: '让智能，稳定地运行。', subtitleEn: 'A foundation for reliable intelligence.',
    topics: [
      ['KV 缓存管理', 'KV cache management', 'PagedAttention 以分页方式管理注意力的键值缓存，减少显存浪费；前缀缓存可复用请求之间相同的输入前缀。', 'PagedAttention manages attention key/value memory in pages. Prefix caching reuses shared input prefixes across requests.'],
      ['连续批处理', 'Continuous batching', '持续调度新请求进入执行批次，结合分块预填充和流式输出，在吞吐量与响应延迟之间做工程权衡。', 'Schedule incoming requests continuously, with chunked prefill and streaming output to balance throughput and latency.'],
      ['并行与服务接口', 'Parallelism & serving', '张量、流水线等并行方式支撑分布式推理；兼容接口帮助应用连接模型服务。规模与配置应通过实际基准测试验证。', 'Distributed inference uses tensor and pipeline parallelism. Compatible APIs connect applications; validate scale and configuration with benchmarks.'],
    ],
  },
  { id: 'embodied-ai', name: '具身智能', en: 'Embodied AI', number: '03', kind: 'EMBODIED', wall: 'EMBODIED AI', accent: '#a3addf',
    source: 'LeRobot', sourceUrl: 'https://huggingface.co/docs/lerobot/index',
    summary: '以 LeRobot 的机器人学习流程为参考，沿着示教采集、策略训练和部署评估，连接数据与真实动作。', summaryEn: 'Follow the robotics learning loop in LeRobot: demonstrations, policy training, deployment and evaluation.',
    subtitle: '把智能，带入真实世界。', subtitleEn: 'Bringing intelligence into the physical world.',
    topics: [
      ['示教与数据', 'Demonstrations & data', '通过遥操作采集示范，将相机视频与动作、状态同步保存，形成可训练、可共享的机器人数据集。', 'Collect demonstrations through teleoperation, synchronizing camera video with actions and states into reusable datasets.'],
      ['策略学习', 'Policy learning', '从示范学习动作策略。ACT 是轻量的模仿学习路线，SmolVLA 等视觉语言动作模型将视觉、语言与动作联系起来。', 'Learn action policies from demonstrations: ACT provides a lightweight imitation-learning path, while SmolVLA connects vision, language and actions.'],
      ['部署与验证', 'Deployment & validation', '将训练后的策略部署到机器人，并在仿真或基准任务中评估。没有硬件时，也可以利用现有数据集和模拟环境开展验证。', 'Deploy learned policies and evaluate in simulation or benchmark tasks. Existing datasets and simulated environments also support hardware-free evaluation.'],
    ],
  },
] as const
