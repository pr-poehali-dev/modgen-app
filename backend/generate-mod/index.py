import json
import os
from typing import Dict, Any
import urllib.request

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Генерирует код мода Minecraft по текстовому описанию
    Args: event - dict с httpMethod, body (description, loader, version)
          context - object с request_id
    Returns: HTTP response с сгенерированным кодом мода
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
    description: str = body_data.get('description', '')
    loader: str = body_data.get('loader', 'forge')
    mc_version: str = body_data.get('version', '1.20.1')
    
    if not description:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Description is required'})
        }
    
    openai_key = os.environ.get('OPENAI_API_KEY')
    if not openai_key:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'OpenAI API key not configured'})
        }
    
    try:
        system_prompt = f"""Ты эксперт по разработке модов для Minecraft.
Генерируй готовый код мода для {loader.upper()} версии {mc_version}.

Требования:
1. Создай полную структуру мода с главным классом
2. Если нужны текстуры, укажи где их разместить
3. Добавь build.gradle файл
4. Код должен компилироваться без ошибок
5. Используй современные практики разработки модов

Верни JSON с полями:
- modName: название мода
- mainClass: код главного класса
- buildGradle: содержимое build.gradle
- files: массив объектов {{path: "путь", content: "содержимое"}}
- textureNeeded: true/false нужна ли AI-генерация текстур
"""
        
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": description}
            ],
            "temperature": 0.7,
            "max_tokens": 3000
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
            mod_data = json.loads(ai_response)
        except json.JSONDecodeError:
            json_start = ai_response.find('{')
            json_end = ai_response.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                mod_data = json.loads(ai_response[json_start:json_end])
            else:
                mod_data = {
                    'modName': 'Generated Mod',
                    'mainClass': ai_response,
                    'buildGradle': '',
                    'files': [],
                    'textureNeeded': False
                }
        
        result = {
            'success': True,
            'modId': context.request_id,
            'modData': mod_data,
            'loader': loader,
            'version': mc_version
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
            'body': json.dumps({'error': f'Generation failed: {str(e)}'})
        }
