/**
 * Document Service
 * Manages employee documents, file uploads, and document generation
 */

import { supabase } from './supabaseClient';
import { User } from '../types';
import { errorHandler } from '../utils/errorHandler';

export type DocumentCategory = 'CONTRACT' | 'PAYSLIP' | 'CERTIFICATE' | 'MEDICAL' | 'DECLARATION' | 'OTHER';
export type DocumentSignatureStatus = 'NONE' | 'PENDING' | 'SIGNED';

export interface Document {
  id: number;
  userId: number;
  title: string;
  category: DocumentCategory;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  signatureStatus: DocumentSignatureStatus;
  signedDate?: string;
  createdAt: string;
  // Joined fields
  userName?: string;
}

export const DocumentCategoryLabels: Record<DocumentCategory, string> = {
  CONTRACT: 'Contrato',
  PAYSLIP: 'Recibo de Vencimento',
  CERTIFICATE: 'Certificado',
  MEDICAL: 'Documento Médico',
  DECLARATION: 'Declaração',
  OTHER: 'Outro'
};

const BUCKET_NAME = 'documents';

export const documentService = {
  async uploadDocument(
    file: File,
    userId: number,
    title: string,
    category: DocumentCategory,
    uploadedBy: string
  ): Promise<Document | null> {
    try {
      // 1. Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${Date.now()}_${file.name}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

      // 3. Insert metadata
      const { data, error } = await supabase.from('documents').insert({
        user_id: userId,
        title,
        category,
        file_url: publicUrl,
        file_name: file.name,
        mime_type: file.type,
        size: file.size,
        uploaded_by: uploadedBy,
        signature_status: 'NONE'
      }).select().single();

      if (error) throw error;

      return mapDocument(data);
    } catch (error) {
      errorHandler.handle(error, 'documentService.uploadDocument');
      return null;
    }
  },

  async fetchDocuments(userId?: number): Promise<Document[]> {
    try {
      let query = supabase.from('documents').select('*, users!documents_user_id_fkey(name)').order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((d: any) => ({
        ...mapDocument(d),
        userName: d.users?.name
      }));
    } catch (error) {
      errorHandler.handleSilent(error, 'documentService.fetchDocuments');
      return [];
    }
  },

  async deleteDocument(id: number): Promise<boolean> {
    try {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      errorHandler.handle(error, 'documentService.deleteDocument');
      return false;
    }
  },

  async updateSignatureStatus(id: number, signedBy: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('documents').update({
        signature_status: 'SIGNED',
        signed_date: new Date().toISOString(),
        uploaded_by: signedBy
      }).eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      errorHandler.handle(error, 'documentService.updateSignatureStatus');
      return false;
    }
    return true;
  },

  generateEmploymentDeclaration(user: User): string {
    const today = new Date().toLocaleDateString('pt-PT');
    return `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><title>Declaração de Emprego</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; max-width: 700px; margin: 40px auto; padding: 40px; line-height: 1.8; color: #333; }
  h1 { text-align: center; font-size: 18px; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 2px; }
  .logo { text-align: center; margin-bottom: 30px; font-size: 24px; font-weight: bold; color: #001529; }
  .signature { margin-top: 80px; border-top: 1px solid #ccc; width: 250px; padding-top: 8px; }
  .footer { margin-top: 40px; font-size: 11px; color: #999; text-align: center; }
</style>
</head>
<body>
  <div class="logo">${user.company || 'SEMRUMO'}</div>
  <h1>Declaração de Vínculo Laboral</h1>
  <p>Para os devidos efeitos, declara-se que <strong>${user.name}</strong>, portador(a) do NIF <strong>${user.nif || '---'}</strong> e CC <strong>${user.cc || '---'}</strong>, exerce funções na empresa <strong>${user.company || 'SEMRUMO'}</strong> desde <strong>${user.admissionDate ? new Date(user.admissionDate).toLocaleDateString('pt-PT') : '---'}</strong>, desempenhando o cargo de <strong>${user.role || '---'}</strong> no departamento de <strong>${user.department || '---'}</strong>.</p>
  <p>A presente declaração é emitida a pedido do(a) interessado(a), para os fins que este(a) entender convenientes.</p>
  <p>${user.address ? `Morada: ${user.address}` : ''}</p>
  <p>Emitida em ${today}.</p>
  <div class="signature">Assinatura Autorizada</div>
  <div class="footer">Documento gerado automaticamente pelo sistema My Portal - ${user.company || 'SEMRUMO'}</div>
</body>
</html>`;
  },

  generateVacationMap(user: User, leaves: { startDate: string; endDate: string; leaveTypeName?: string; status: string }[]): string {
    const year = new Date().getFullYear();
    const approvedLeaves = leaves.filter(l => l.status === 'APPROVED');
    const rows = approvedLeaves.map(l =>
      `<tr><td>${new Date(l.startDate).toLocaleDateString('pt-PT')}</td><td>${new Date(l.endDate).toLocaleDateString('pt-PT')}</td><td>${l.leaveTypeName || 'Férias'}</td></tr>`
    ).join('');

    return `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><title>Mapa de Férias ${year}</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; max-width: 700px; margin: 40px auto; padding: 40px; color: #333; }
  h1 { text-align: center; font-size: 18px; margin-bottom: 10px; }
  h2 { text-align: center; font-size: 14px; color: #666; margin-bottom: 30px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; font-size: 13px; }
  th { background: #f8f9fa; font-weight: bold; }
  .footer { margin-top: 40px; font-size: 11px; color: #999; text-align: center; }
</style>
</head>
<body>
  <h1>Mapa de Férias ${year}</h1>
  <h2>${user.name} - ${user.department || ''} - ${user.company || 'SEMRUMO'}</h2>
  <table>
    <thead><tr><th>Data Início</th><th>Data Fim</th><th>Tipo</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="3" style="text-align:center;color:#999;">Sem férias aprovadas</td></tr>'}</tbody>
  </table>
  <div class="footer">Documento gerado automaticamente pelo sistema My Portal</div>
</body>
</html>`;
  }
};

function mapDocument(d: any): Document {
  return {
    id: d.id,
    userId: d.user_id,
    title: d.title,
    category: d.category,
    fileUrl: d.file_url,
    fileName: d.file_name,
    mimeType: d.mime_type,
    size: d.size,
    uploadedBy: d.uploaded_by,
    signatureStatus: d.signature_status || 'NONE',
    signedDate: d.signed_date,
    createdAt: d.created_at
  };
}
