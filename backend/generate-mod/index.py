import json
import os
from typing import Dict, Any
import urllib.request

def generate_demo_mod(description: str, loader: str, mc_version: str) -> Dict:
    """Генерирует базовую структуру мода без AI"""
    mod_name = description[:30].replace(' ', '')
    
    main_class = f"""package com.example.{mod_name.lower()};

import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.event.lifecycle.FMLCommonSetupEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;

@Mod("{mod_name.lower()}")
public class {mod_name}Mod {{
    public static final String MOD_ID = "{mod_name.lower()}";
    
    public {mod_name}Mod() {{
        System.out.println("Loading {mod_name} Mod!");
    }}
    
    @SubscribeEvent
    public void setup(FMLCommonSetupEvent event) {{
        System.out.println("{mod_name} mod setup complete!");
    }}
}}
"""
    
    build_gradle = f"""plugins {{
    id 'net.minecraftforge.gradle' version '5.1.+'
}}

group = 'com.example'
version = '1.0.0'

java {{
    toolchain.languageVersion = JavaLanguageVersion.of(17)
}}

minecraft {{
    mappings channel: 'official', version: '{mc_version}'
}}

dependencies {{
    minecraft 'net.minecraftforge:forge:{mc_version}-47.1.0'
}}
"""
    
    return {
        'modName': mod_name,
        'mainClass': main_class,
        'buildGradle': build_gradle,
        'files': [
            {
                'path': 'src/main/resources/META-INF/mods.toml',
                'content': f'modLoader="javafml"\nloaderVersion="[47,)"\nlicense="MIT"\n[[mods]]\nmodId="{mod_name.lower()}"\nversion="1.0.0"\ndisplayName="{mod_name}"\ndescription="{description}"'
            }
        ],
        'textureNeeded': False
    }

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
    
    try:
        if openai_key:
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
                    mod_data = generate_demo_mod(description, loader, mc_version)
        else:
            mod_data = generate_demo_mod(description, loader, mc_version)
        
        result = {
            'success': True,
            'modId': context.request_id,
            'modData': mod_data,
            'loader': loader,
            'version': mc_version,
            'demoMode': not bool(openai_key)
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
        mod_data = generate_demo_mod(description, loader, mc_version)
        result = {
            'success': True,
            'modId': context.request_id,
            'modData': mod_data,
            'loader': loader,
            'version': mc_version,
            'demoMode': True,
            'aiError': str(e)
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
