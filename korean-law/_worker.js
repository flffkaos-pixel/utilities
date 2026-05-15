// 대한법률AI - Cloudflare Worker 백엔드
// korean-law-mcp + OpenAI API 연동
// 
// 환경변수 설정 (Cloudflare Dashboard > Workers > Variables):
//   OPENAI_API_KEY  - OpenAI API 키 (필수)
//   LAW_OC          - 법제처 Open API 인증키 (필수)
//   KOREAN_LAW_MCP_URL - korean-law-mcp 서버 URL (기본값: https://korean-law-mcp.fly.dev/mcp)
//
// 프론트엔드에서 /api/korean-law/chat 경로로 POST 요청

const KOREAN_LAW_MCP_URL = 'https://korean-law-mcp.fly.dev/mcp';

async function callKoreanLawMCP(oc, toolName, args) {
  // MCP 서버에 도구 호출 요청
  // HTTP MCP 프로토콜 사용
  const url = `${KOREAN_LAW_MCP_URL}?oc=${encodeURIComponent(oc)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: toolName, arguments: args },
      id: crypto.randomUUID()
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'MCP Error');
  return data.result;
}

async function callOpenAI(apiKey, messages, tools) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 대한민국 법률 전문 AI 어시스턴트입니다.
사용자의 법률 질문에 대해 법제처 공식 API(korean-law-mcp)를 활용하여 정확한 법령과 판례를 검색한 후 답변합니다.

답변 작성 규칙:
1. 항상 관련 법령 조문을 명시하세요 (예: "민법 제750조(불법행위의 내용)")
2. 가능한 경우 관련 판례를 인용하세요
3. 법률적 근거를 설명하고, 일반인의 관점에서 이해하기 쉽게 풀어주세요
4. 답변은 한글로 작성하세요
5. 답변 끝에 "⚠️ 본 답변은 참고용이며 법적 효력이 없습니다. 정확한 법률 조언은 전문 변호사와 상담하세요."를 추가하세요
6. 법령 검색이 필요한 경우 korean-law 도구를 사용하세요`
        },
        ...messages
      ],
      tools: tools,
      tool_choice: 'auto',
      max_tokens: 4096,
      temperature: 0.3
    })
  });
  return await response.json();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (request.method === 'GET' && path === '/api/korean-law/health') {
      return new Response(JSON.stringify({ status: 'ok', version: '1.0.0' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Chat endpoint
    if (request.method === 'POST' && path === '/api/korean-law/chat') {
      try {
        const { message } = await request.json();
        if (!message) {
          return new Response(JSON.stringify({ error: '질문을 입력해주세요.' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const openaiKey = env.OPENAI_API_KEY;
        const oc = env.LAW_OC;

        if (!openaiKey || !oc) {
          return new Response(JSON.stringify({
            error: 'API 키가 설정되지 않았습니다. 관리자에게 문의하거나 설정 페이지를 확인하세요.',
            needsSetup: true
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // MCP 도구 목록을 OpenAI 함수 호출 형식으로 변환
        const koreanLawTools = [
          {
            type: 'function',
            function: {
              name: 'search_law',
              description: '법령 검색 - 법령명으로 검색하여 lawId와 MST 획득',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: '검색어 (법령명)' }
                },
                required: ['query']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'get_law_text',
              description: '조문 전문 조회 - 특정 법령의 조문 내용을 가져옴',
              parameters: {
                type: 'object',
                properties: {
                  lawName: { type: 'string', description: '법령명' },
                  articleNo: { type: 'string', description: '조문 번호 (예: 003800은 제38조)' }
                },
                required: ['lawName']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'search_decisions',
              description: '판례/결정례 통합 검색 - 17개 도메인(대법원, 헌재, 조세심판, 공정위 등)',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: '검색어' },
                  domain: { type: 'string', enum: ['precedent', 'constitutional', 'tax_tribunal', 'ftc', 'nlrc', 'admin_appeal', 'pipc', 'acr', 'customs', 'interpretation', 'ordinance', 'treaty'], description: '검색 도메인' }
                },
                required: ['query']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'chain_action_plan',
              description: '시민 5단계 실행 가이드 - 법적 문제에 대한 실제 행동 단계 제시',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: '법적 문제 설명' }
                },
                required: ['query']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'chain_full_research',
              description: '종합 법률 리서치 - 법령+판례+해석 통합 검색',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: '연구 주제' }
                },
                required: ['query']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'verify_citations',
              description: '인용 검증 - AI 답변의 법령 인용이 실제로 존재하는지 법제처 DB로 교차검증',
              parameters: {
                type: 'object',
                properties: {
                  text: { type: 'string', description: '검증할 텍스트' }
                },
                required: ['text']
              }
            }
          }
        ];

        // OpenAI에 질문 전송
        const aiResponse = await callOpenAI(openaiKey, [
          { role: 'user', content: message }
        ], koreanLawTools);

        // Tool call이 있는 경우 처리
        if (aiResponse.choices?.[0]?.message?.tool_calls) {
          const toolCalls = aiResponse.choices[0].message.tool_calls;
          const toolResults = [];

          for (const toolCall of toolCalls) {
            const args = JSON.parse(toolCall.function.arguments);
            try {
              let result;
              switch (toolCall.function.name) {
                case 'search_law':
                  result = await callKoreanLawMCP(oc, 'search_law', args);
                  break;
                case 'get_law_text':
                  result = await callKoreanLawMCP(oc, 'get_law_text', args);
                  break;
                case 'search_decisions':
                  result = await callKoreanLawMCP(oc, 'search_decisions', args);
                  break;
                case 'chain_action_plan':
                  result = await callKoreanLawMCP(oc, 'chain_action_plan', args);
                  break;
                case 'chain_full_research':
                  result = await callKoreanLawMCP(oc, 'chain_full_research', args);
                  break;
                case 'verify_citations':
                  result = await callKoreanLawMCP(oc, 'verify_citations', args);
                  break;
                default:
                  result = { error: `Unknown tool: ${toolCall.function.name}` };
              }
              toolResults.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
              });
            } catch (e) {
              toolResults.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: e.message })
              });
            }
          }

          // Tool 결과를 포함하여 최종 답변 생성
          const finalResponse = await callOpenAI(openaiKey, [
            { role: 'user', content: message },
            aiResponse.choices[0].message,
            ...toolResults
          ], koreanLawTools);

          const finalAnswer = finalResponse.choices?.[0]?.message?.content || '답변을 생성할 수 없습니다.';
          return new Response(JSON.stringify({ answer: finalAnswer }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Tool call이 없는 경우 직접 답변 반환
        const answer = aiResponse.choices?.[0]?.message?.content || '답변을 생성할 수 없습니다.';
        return new Response(JSON.stringify({ answer }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: `서버 오류: ${e.message}` }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};
