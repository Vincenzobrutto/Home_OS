import * as fs from 'fs';
import * as path from 'path';
import { FileStorageService } from './file-storage.service';

describe('FileStorageService', () => {
  const service = new FileStorageService();
  const createdPaths: string[] = [];

  afterEach(() => {
    for (const filePath of createdPaths.splice(0)) {
      fs.rmSync(filePath, { force: true });
    }
  });

  it('elimina fisicamente il file solo dopo la cancellazione DB', async () => {
    const fileUrl = service.store({
      originalname: 'manuale.pdf',
      buffer: Buffer.from('contenuto'),
    });
    const absolutePath = path.resolve(process.cwd(), fileUrl);
    createdPaths.push(absolutePath);

    await service.withFilesRemoved([fileUrl], async () => {
      expect(fs.existsSync(absolutePath)).toBe(false);
      return undefined;
    });

    expect(fs.existsSync(absolutePath)).toBe(false);
  });

  it('ripristina il file se la cancellazione DB fallisce', async () => {
    const fileUrl = service.store({
      originalname: 'fattura.pdf',
      buffer: Buffer.from('contenuto'),
    });
    const absolutePath = path.resolve(process.cwd(), fileUrl);
    createdPaths.push(absolutePath);

    await expect(
      service.withFilesRemoved([fileUrl], async () => {
        throw new Error('DB non disponibile');
      }),
    ).rejects.toThrow('DB non disponibile');

    expect(fs.readFileSync(absolutePath, 'utf8')).toBe('contenuto');
  });

  it('ripristina tutti i file di una casa se la cancellazione DB fallisce', async () => {
    const fileUrls = ['uno', 'due'].map((name) =>
      service.store({
        originalname: `${name}.pdf`,
        buffer: Buffer.from(name),
      }),
    );
    const absolutePaths = fileUrls.map((fileUrl) =>
      path.resolve(process.cwd(), fileUrl),
    );
    createdPaths.push(...absolutePaths);

    await expect(
      service.withFilesRemoved(fileUrls, async () => {
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');

    expect(absolutePaths.map((filePath) => fs.existsSync(filePath))).toEqual([
      true,
      true,
    ]);
  });

  it('rifiuta percorsi fuori dalla directory uploads', () => {
    expect(() => service.resolveExisting('../segreto.txt')).toThrow(
      'Percorso file non valido',
    );
  });
});
