import json
import os
from typing import Dict, Any
import urllib.request

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Обновляет существующий мод по запросу в чате
    Args: event - dict с httpMethod, body (modId, message, currentCode)
          context - object с request_id
    Returns: HTTP response с обновленным кодом и ответом AI
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    body_data = json.loads(event.get('body', '{}'))
    mod_id: str = body_data.get('modId', '')
    message: str = body_data.get('message', '')
    current_code: Dict = body_data.get('currentCode', {})
    
    if not message:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Message is required'})
        }
    
    openai_key = os.environ.get('OPENAI_API_KEY')
    if not openai_key:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'OpenAI API key not configured'})
        }
    
    try:
        system_prompt = """Ты AI-ассистент для обновления Minecraft модов.
Пользователь опишет что хочет изменить/добавить в мод.

Верни JSON с полями:
- aiMessage: дружелюбный ответ пользователю что ты сделал
- updatedCode: обновленная структура мода (mainClass, files, buildGradle)
- changes: массив изменений ["добавлен новый предмет", "увеличена прочность"]
"""
        
        code_context = json.dumps(current_code, ensure_ascii=False, indent=2) if current_code else "Нет кода"
        
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Текущий код мода:\n{code_context}\n\nЗапрос: {message}"}
            ],
            "temperature": 0.7,
            "max_tokens": 2000
        }
        
        req = urllib.request.Request(
            'https://api.openai.com/v1/chat/completions',
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {openai_key}'
            },
            method='POST'
        )
        
        with urllib.request.urlopen(req) as response:
            result_data = json.loads(response.read().decode('utf-8'))
        
        ai_response = result_data['choices'][0]['message']['content']
        
        try:
            update_data = json.loads(ai_response)
        except json.JSONDecodeError:
            json_start = ai_response.find('{')
            json_end = ai_response.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                update_data = json.loads(ai_response[json_start:json_end])
            else:
                update_data = {
                    'aiMessage': 'Понял! Обновляю мод согласно запросу.',
                    'updatedCode': current_code,
                    'changes': ['Обновление выполнено']
                }
        
        result = {
            'success': True,
            'aiMessage': update_data.get('aiMessage', 'Готово!'),
            'updatedCode': update_data.get('updatedCode', current_code),
            'changes': update_data.get('changes', [])
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps(result, ensure_ascii=False)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': f'Update failed: {str(e)}'})
        }
