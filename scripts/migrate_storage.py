#!/usr/bin/env python3
"""
Script de Migração: Supabase Storage → Hostinger

Este script faz download de todos os arquivos do Supabase Storage
e os envia para o armazenamento da Hostinger.

Uso:
    python3 migrate_storage.py --supabase-url <URL> --supabase-key <KEY> \
                                --hostinger-url <URL> --hostinger-key <KEY>

Requisitos:
    - supabase-py
    - requests
"""

import argparse
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional
import json
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    import requests
    from supabase import create_client
except ImportError:
    logger.error("Dependências não encontradas. Instale com: pip install supabase requests")
    sys.exit(1)


class StorageMigrator:
    """Classe para gerenciar a migração de arquivos entre storages"""

    def __init__(
        self,
        supabase_url: str,
        supabase_key: str,
        hostinger_url: str,
        hostinger_key: str,
        temp_dir: str = "/tmp/doka_migration"
    ):
        self.supabase = create_client(supabase_url, supabase_key)
        self.hostinger_url = hostinger_url
        self.hostinger_key = hostinger_key
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        
        # Configuração dos buckets
        self.buckets = {
            'ebooks': {'type': 'private', 'hostinger_bucket': 'doka-private'},
            'book-covers': {'type': 'public', 'hostinger_bucket': 'doka-public'},
            'book-files': {'type': 'private', 'hostinger_bucket': 'doka-private'},
            'comprovativos': {'type': 'private', 'hostinger_bucket': 'doka-private'},
            'button-covers': {'type': 'public', 'hostinger_bucket': 'doka-public'},
            'hero-images': {'type': 'public', 'hostinger_bucket': 'doka-public'},
            'landing-images': {'type': 'public', 'hostinger_bucket': 'doka-public'},
            'avatars': {'type': 'public', 'hostinger_bucket': 'doka-public'},
        }
        
        self.migration_log: List[Dict] = []

    def list_files_in_bucket(self, bucket: str) -> List[str]:
        """Lista todos os arquivos em um bucket do Supabase"""
        try:
            logger.info(f"Listando arquivos do bucket '{bucket}'...")
            files = []
            
            # Listar recursivamente
            def list_recursive(path: str = ""):
                try:
                    response = self.supabase.storage.from(bucket).list(path)
                    for item in response:
                        full_path = f"{path}/{item['name']}" if path else item['name']
                        
                        if item['metadata'] is None:  # É um diretório
                            files.extend(list_recursive(full_path))
                        else:  # É um arquivo
                            files.append(full_path)
                except Exception as e:
                    logger.warning(f"Erro ao listar {path}: {e}")
            
            list_recursive()
            logger.info(f"Encontrados {len(files)} arquivos no bucket '{bucket}'")
            return files
        except Exception as e:
            logger.error(f"Erro ao listar bucket '{bucket}': {e}")
            return []

    def download_file(self, bucket: str, file_path: str) -> Optional[bytes]:
        """Faz download de um arquivo do Supabase"""
        try:
            logger.debug(f"Baixando {bucket}/{file_path}...")
            response = self.supabase.storage.from(bucket).download(file_path)
            return response
        except Exception as e:
            logger.error(f"Erro ao baixar {bucket}/{file_path}: {e}")
            return None

    def upload_to_hostinger(
        self,
        file_path: str,
        file_data: bytes,
        hostinger_bucket: str
    ) -> bool:
        """Faz upload de um arquivo para a Hostinger"""
        try:
            logger.debug(f"Enviando para Hostinger: {hostinger_bucket}/{file_path}...")
            
            # Construir URL de upload
            upload_url = f"{self.hostinger_url}/v1/storage/buckets/{hostinger_bucket}/objects"
            
            headers = {
                'Authorization': f'Bearer {self.hostinger_key}',
            }
            
            files = {
                'file': (file_path.split('/')[-1], file_data),
            }
            
            data = {
                'path': file_path,
            }
            
            response = requests.post(upload_url, headers=headers, files=files, data=data)
            
            if response.status_code in [200, 201]:
                logger.debug(f"Upload bem-sucedido: {hostinger_bucket}/{file_path}")
                return True
            else:
                logger.error(f"Erro no upload: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"Erro ao fazer upload para Hostinger: {e}")
            return False

    def migrate_bucket(self, bucket: str) -> Dict:
        """Migra todos os arquivos de um bucket"""
        logger.info(f"Iniciando migração do bucket '{bucket}'...")
        
        bucket_config = self.buckets.get(bucket)
        if not bucket_config:
            logger.error(f"Bucket '{bucket}' não configurado")
            return {'bucket': bucket, 'status': 'error', 'files_total': 0, 'files_migrated': 0}
        
        hostinger_bucket = bucket_config['hostinger_bucket']
        
        # Listar arquivos
        files = self.list_files_in_bucket(bucket)
        
        if not files:
            logger.warning(f"Nenhum arquivo encontrado no bucket '{bucket}'")
            return {'bucket': bucket, 'status': 'success', 'files_total': 0, 'files_migrated': 0}
        
        # Migrar cada arquivo
        migrated = 0
        failed = 0
        
        for i, file_path in enumerate(files, 1):
            logger.info(f"[{i}/{len(files)}] Migrando {bucket}/{file_path}...")
            
            # Download
            file_data = self.download_file(bucket, file_path)
            if not file_data:
                failed += 1
                self.migration_log.append({
                    'bucket': bucket,
                    'file': file_path,
                    'status': 'failed',
                    'reason': 'download_failed'
                })
                continue
            
            # Upload
            if self.upload_to_hostinger(file_path, file_data, hostinger_bucket):
                migrated += 1
                self.migration_log.append({
                    'bucket': bucket,
                    'file': file_path,
                    'status': 'success',
                    'hostinger_bucket': hostinger_bucket
                })
            else:
                failed += 1
                self.migration_log.append({
                    'bucket': bucket,
                    'file': file_path,
                    'status': 'failed',
                    'reason': 'upload_failed'
                })
        
        logger.info(f"Migração do bucket '{bucket}' concluída: {migrated} sucesso, {failed} falhas")
        
        return {
            'bucket': bucket,
            'status': 'success',
            'files_total': len(files),
            'files_migrated': migrated,
            'files_failed': failed
        }

    def migrate_all(self) -> Dict:
        """Migra todos os buckets"""
        logger.info("Iniciando migração de todos os buckets...")
        
        results = {}
        for bucket in self.buckets.keys():
            results[bucket] = self.migrate_bucket(bucket)
        
        # Salvar log
        self.save_migration_log()
        
        return results

    def save_migration_log(self):
        """Salva o log de migração em um arquivo JSON"""
        log_file = self.temp_dir / "migration_log.json"
        try:
            with open(log_file, 'w') as f:
                json.dump(self.migration_log, f, indent=2)
            logger.info(f"Log de migração salvo em: {log_file}")
        except Exception as e:
            logger.error(f"Erro ao salvar log: {e}")

    def generate_report(self, results: Dict) -> str:
        """Gera um relatório da migração"""
        report = "=" * 60 + "\n"
        report += "RELATÓRIO DE MIGRAÇÃO DE STORAGE\n"
        report += "=" * 60 + "\n\n"
        
        total_files = 0
        total_migrated = 0
        total_failed = 0
        
        for bucket, result in results.items():
            report += f"Bucket: {bucket}\n"
            report += f"  Status: {result['status']}\n"
            report += f"  Total de arquivos: {result['files_total']}\n"
            report += f"  Migrados com sucesso: {result['files_migrated']}\n"
            report += f"  Falhados: {result['files_failed']}\n\n"
            
            total_files += result['files_total']
            total_migrated += result['files_migrated']
            total_failed += result['files_failed']
        
        report += "=" * 60 + "\n"
        report += f"RESUMO GERAL\n"
        report += f"Total de arquivos: {total_files}\n"
        report += f"Migrados com sucesso: {total_migrated}\n"
        report += f"Falhados: {total_failed}\n"
        report += f"Taxa de sucesso: {(total_migrated / total_files * 100) if total_files > 0 else 0:.2f}%\n"
        report += "=" * 60 + "\n"
        
        return report


def main():
    parser = argparse.ArgumentParser(description='Migrar arquivos do Supabase para Hostinger')
    parser.add_argument('--supabase-url', required=True, help='URL do Supabase')
    parser.add_argument('--supabase-key', required=True, help='Chave de API do Supabase')
    parser.add_argument('--hostinger-url', required=True, help='URL da API da Hostinger')
    parser.add_argument('--hostinger-key', required=True, help='Chave de API da Hostinger')
    parser.add_argument('--temp-dir', default='/tmp/doka_migration', help='Diretório temporário')
    parser.add_argument('--bucket', help='Migrar apenas um bucket específico')
    
    args = parser.parse_args()
    
    # Criar migrador
    migrator = StorageMigrator(
        supabase_url=args.supabase_url,
        supabase_key=args.supabase_key,
        hostinger_url=args.hostinger_url,
        hostinger_key=args.hostinger_key,
        temp_dir=args.temp_dir
    )
    
    # Executar migração
    if args.bucket:
        results = {args.bucket: migrator.migrate_bucket(args.bucket)}
    else:
        results = migrator.migrate_all()
    
    # Gerar e exibir relatório
    report = migrator.generate_report(results)
    print(report)
    
    # Salvar relatório
    report_file = Path(args.temp_dir) / "migration_report.txt"
    with open(report_file, 'w') as f:
        f.write(report)
    logger.info(f"Relatório salvo em: {report_file}")


if __name__ == '__main__':
    main()
