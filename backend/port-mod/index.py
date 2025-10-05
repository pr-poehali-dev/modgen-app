import json
import os
from typing import Dict, Any
import urllib.request
import zipfile
import io
import base64

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Анализирует JAR мод и портирует на другую версию Minecraft
    Args: event - dict с httpMethod, body (jarBase64, targetVersion, loader)
          context - object с request_id
    Returns: HTTP response с портированным кодом мода
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
    jar_base64: str = body_data.get('jarBase64', '')
    target_version: str = body_data.get('targetVersion', '1.20.1')
    loader: str = body_data.get('loader', 'forge')
    
    if not jar_base64:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'JAR file required'})
        }
    
    try:
        jar_bytes = base64.b64decode(jar_base64)
        jar_file = io.BytesIO(jar_bytes)
        
        extracted_files = []
        java_files = []
        
        with zipfile.ZipFile(jar_file, 'r') as zip_ref:
            for file_info in zip_ref.filelist:
                if file_info.filename.endswith('.class'):
                    continue
                    
                content = zip_ref.read(file_info.filename).decode('utf-8', errors='ignore')
                
                if file_info.filename.endswith('.java'):
                    java_files.append({
                        'path': file_info.filename,
                        'content': content
                    })
                elif file_info.filename.endswith(('.json', '.toml', '.gradle')):
                    extracted_files.append({
                        'path': file_info.filename,
                        'content': content
                    })
        
        openai_key = os.environ.get('OPENAI_API_KEY')
        
        if openai_key and java_files:
            analysis_text = f"Найдено {len(java_files)} Java файлов:\n"
            for jf in java_files[:3]:
                analysis_text += f"\n{jf['path']}:\n{jf['content'][:500]}...\n"
            
            system_prompt = f"""Ты эксперт по портированию Minecraft модов.
Анализируй код мода и портируй его на {loader.upper()} версии {target_version}.

Изменения при портировании:
1. Обнови import'ы под новую версию API
2. Замени устаревшие методы на актуальные
3. Адаптируй систему регистрации предметов/блоков
4. Обнови mappings и события
5. Исправь breaking changes между версиями

Верни JSON:
- modName: название мода
- mainClass: обновленный главный класс
- buildGradle: новый build.gradle для целевой версии
- files: массив портированных файлов
- changes: список основных изменений
"""
            
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": analysis_text}
                ],
                "temperature": 0.5,
                "max_tokens": 4000
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
                port_data = json.loads(ai_response)
            except json.JSONDecodeError:
                json_start = ai_response.find('{')
                json_end = ai_response.rfind('}') + 1
                if json_start != -1 and json_end > json_start:
                    port_data = json.loads(ai_response[json_start:json_end])
                else:
                    raise ValueError("Failed to parse AI response")
        else:
            port_data = {
                'modName': 'PortedMod',
                'mainClass': java_files[0]['content'] if java_files else '// No Java files found',
                'buildGradle': f'''plugins {{
    id 'net.minecraftforge.gradle' version '5.1.+'
}}

group = 'com.example'
version = '1.0.0-{target_version}'

minecraft {{
    mappings channel: 'official', version: '{target_version}'
}}

dependencies {{
    minecraft 'net.minecraftforge:forge:{target_version}-47.1.0'
}}''',
                'files': extracted_files,
                'changes': ['Базовая конвертация структуры проекта']
            }
        
        result = {
            'success': True,
            'portId': context.request_id,
            'modData': port_data,
            'sourceFiles': len(java_files),
            'targetVersion': target_version,
            'loader': loader
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
            'body': json.dumps({'error': f'Port failed: {str(e)}'})
        }
