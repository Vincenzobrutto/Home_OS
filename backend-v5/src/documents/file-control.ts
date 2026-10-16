import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { readFile, lstat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { digest } from '../security';
export type FileControlReceipt = { engine: 'microsoft_defender'; checkedAt: Date; signatureVersion: string };
export const fileControlUnavailable = () => new ServiceUnavailableException({code:'file_check_unavailable',message:'Controllo del file non completato. Nessun documento è stato salvato. Riprova più tardi.'});
type Engine = { executable: string; signatureVersion: string };
const HEALTH = `$ErrorActionPreference='Stop'; $s=Get-MpComputerStatus; $root=Join-Path $env:ProgramData 'Microsoft\\Windows Defender\\Platform'; $exe=$null; foreach($d in (Get-ChildItem -LiteralPath $root -Directory | Sort-Object Name -Descending)) { $p=Join-Path $d.FullName 'MpCmdRun.exe'; if(Test-Path -LiteralPath $p) { $exe=$p; break } }; if(!$exe) { throw 'Scanner unavailable' }; $sig=Get-AuthenticodeSignature -LiteralPath $exe; [pscustomobject]@{ executable=$exe; trusted=($sig.Status -eq 'Valid' -and $sig.SignerCertificate.Subject -match 'Microsoft Corporation'); service=$s.AMServiceEnabled; antivirus=$s.AntivirusEnabled; realtime=$s.RealTimeProtectionEnabled; signatureVersion=$s.AntivirusSignatureVersion; signatureAt=$s.AntivirusSignatureLastUpdated.ToUniversalTime().ToString('o') } | ConvertTo-Json -Compress`;
@Injectable()
export class WindowsDefenderScanner {
  private running = 0;
  protected command(executable: string, args: string[]): Promise<{code:number;stdout:string}> {
    const env=Object.fromEntries(['SystemRoot','ProgramData','ProgramFiles','ProgramW6432','PATH','TEMP','TMP','USERPROFILE'].flatMap(key=>process.env[key]===undefined?[]:[[key,process.env[key]!]]));
    // Windows PowerShell must use its own modules, not inherited PowerShell 7 modules.
    env.PSModulePath=join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','Modules');
    return new Promise((resolve,reject)=>execFile(executable,args,{windowsHide:true,timeout:30000,maxBuffer:1024*1024,env},(error,stdout)=>{
      if(error && typeof (error as {code?:unknown}).code !== 'number') { reject(fileControlUnavailable()); return; }
      resolve({code:error?(error as unknown as {code:number}).code:0,stdout});
    }));
  }
  protected async engine(): Promise<Engine> {
    if(process.platform!=='win32')throw fileControlUnavailable();
    const shell=join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
    const result=await this.command(shell,['-NoProfile','-NonInteractive','-Command',HEALTH]);
    try {
      const s=JSON.parse(result.stdout.replace(/^\uFEFF/,'').trim()),age=Date.now()-Date.parse(s.signatureAt);
      if(result.code!==0||s.trusted!==true||s.service!==true||s.antivirus!==true||s.realtime!==true||!Number.isFinite(age)||age< -300000||age>7*86400000||typeof s.signatureVersion!=='string'||!s.signatureVersion||typeof s.executable!=='string')throw Error();
      return {executable:s.executable,signatureVersion:s.signatureVersion};
    } catch {throw fileControlUnavailable();}
  }
  async scan(path: string, expectedSha256: string): Promise<FileControlReceipt> {
    if(this.running>=2)throw fileControlUnavailable();
    this.running++;
    try {
      if(!/^[a-f0-9-]{36}\.bin\.part$/.test(basename(path)))throw fileControlUnavailable();
      const stat=await lstat(path);if(!stat.isFile()||stat.isSymbolicLink()||digest(await readFile(path))!==expectedSha256)throw fileControlUnavailable();
      const engine=await this.engine();
      // Report-only custom scan, not a change to Windows protection settings.
      // No auto-remediation means exit 0 cannot mean an altered, repaired file.
      // Any nonzero/unknown verdict blocks admission; output is never logged.
      const verdict=await this.command(engine.executable,['-Scan','-ScanType','3','-File',path,'-DisableRemediation']);
      if(verdict.code!==0||digest(await readFile(path))!==expectedSha256)throw fileControlUnavailable();
      return {engine:'microsoft_defender',checkedAt:new Date(),signatureVersion:engine.signatureVersion};
    } catch {throw fileControlUnavailable();} finally {this.running--;}
  }
}
