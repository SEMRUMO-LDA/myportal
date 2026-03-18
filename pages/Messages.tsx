import React, { useState } from 'react';
import SearchableSelect from '../components/SearchableSelect';
import Header from '../components/Header';
import { InternalMessage, User, Company } from '../types';
import { Mail, Send, Inbox, AlertCircle, Plus, Search, User as UserIcon, Users, Building2, Globe, CheckCircle, Trash2, Reply, MessageCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { wassengerService } from '../services/wassengerService';

interface MessagesProps {
  currentUser?: User;
  users: User[];
  messages: InternalMessage[];
  onSendMessage: (messages: InternalMessage[]) => void;
  onMarkRead: (id: string) => void;
}

const Messages: React.FC<MessagesProps> = ({ currentUser, users, messages, onSendMessage, onMarkRead }) => {
  const [selectedMessage, setSelectedMessage] = useState<InternalMessage | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Compose State
  const [sendType, setSendType] = useState<'INDIVIDUAL' | 'GROUP'>('INDIVIDUAL');
  const [toUser, setToUser] = useState<string>('');
  const [targetCompany, setTargetCompany] = useState<string>('ALL'); // 'ALL' or specific Company
  const [subject, setSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT'>('NORMAL');
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const { addToast } = useToast();

  const filteredMessages = messages.filter(msg => {
    // 1. Filter by Search
    const matchesSearch =
      msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.senderName.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Filter by Current User context (if applicable)
    let matchesUser = true;
    if (currentUser) {
      // Employee sees only their messages
      matchesUser = msg.receiverId === currentUser.id || msg.senderId === currentUser.id;
    }

    return matchesSearch && matchesUser;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort desc

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const newMessages: InternalMessage[] = [];
    const date = new Date().toISOString().split('T')[0];
    const senderId = currentUser ? currentUser.id : 'SYSTEM';
    const senderName = currentUser ? currentUser.name : 'Admin RH';

    // 1. Identify Target Users
    let targetUsers: User[] = [];
    if (sendType === 'INDIVIDUAL') {
      const target = users.find(u => u.id === Number(toUser));
      if (target) targetUsers = [target];
    } else {
      if (targetCompany === 'ALL') {
        targetUsers = users.filter(u => u.id !== currentUser?.id);
      } else {
        targetUsers = users.filter(u => u.company === targetCompany && u.id !== currentUser?.id);
      }
    }

    if (targetUsers.length === 0) {
      if (sendType === 'GROUP') {
        addToast('warning', "Não foram encontrados colaboradores para o critério selecionado.");
      }
      return;
    }

    // 2. Prepare Internal Messages
    targetUsers.forEach((target, index) => {
      newMessages.push({
        id: `msg-${Date.now()}-${index}`,
        senderId,
        senderName,
        receiverId: target.id,
        subject,
        content: messageContent,
        date,
        read: false,
        priority
      });
    });

    onSendMessage(newMessages);
    setIsComposeOpen(false);

    // Reset Form
    setToUser('');
    setSubject('');
    setMessageContent('');
    setPriority('NORMAL');
    setSendWhatsApp(false);
    setSendType('INDIVIDUAL');
    setTargetCompany('ALL');

    const count = targetUsers.length;
    addToast('success', `Mensagem interna enviada para ${count} destinatário(s).`);

    // 3. Send WhatsApp messages (after closing modal, with feedback)
    if (sendWhatsApp) {
      try {
        await wassengerService.loadConfig();
        if (!wassengerService.isConfigured()) {
          addToast('error', 'WhatsApp: Chave API Wassenger não configurada. Configure em Definições → Integrações.');
          return;
        }
      } catch {
        addToast('error', 'WhatsApp: Erro ao carregar configuração Wassenger.');
        return;
      }

      let waSent = 0;
      let waFailed = 0;
      let waSkipped = 0;

      for (const target of targetUsers) {
        const whatsappNumber = target.mobilePhone || target.phone;
        // BYPASS: Admin messages ignore the "whatsappEnabled" toggle (which is for attendance alerts)
        if (!whatsappNumber) {
          waSkipped++;
          continue;
        }

        try {
          await wassengerService.sendMessage(whatsappNumber, `${subject}\n\n${messageContent}`);
          waSent++;
        } catch (err: any) {
          waFailed++;
          console.error(`WhatsApp falhou para ${target.name}:`, err?.message || err);
        }
      }

      // Show consolidated feedback
      if (waSent > 0 && waFailed === 0) {
        addToast('success', `✅ WhatsApp enviado para ${waSent} colaborador(es).`);
      } else if (waSent > 0 && waFailed > 0) {
        addToast('warning', `WhatsApp: ${waSent} enviado(s), ${waFailed} falhou/falharam.`);
      } else if (waFailed > 0) {
        addToast('error', `WhatsApp: Falha no envio para ${waFailed} colaborador(es). Verifique a configuração Wassenger.`);
      }
      if (waSkipped > 0) {
        addToast('info', `${waSkipped} colaborador(es) sem número WhatsApp configurado.`);
      }
    }
  };

  const handleReadMessage = (msg: InternalMessage) => {
    setSelectedMessage(msg);
    if (!msg.read && currentUser && msg.receiverId === currentUser.id) {
      onMarkRead(msg.id);
    }
  };

  const handleReply = () => {
    if (!selectedMessage) return;
    setSendType('INDIVIDUAL');
    setToUser(selectedMessage.senderId.toString());
    setSubject(selectedMessage.subject.startsWith('Re:') ? selectedMessage.subject : `Re: ${selectedMessage.subject}`);
    setMessageContent(`\n\n--- Em ${selectedMessage.date}, ${selectedMessage.senderName} escreveu: ---\n${selectedMessage.content}`);
    setIsComposeOpen(true);
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-7xl mx-auto h-[calc(100vh-5rem)] md:h-[calc(100vh-2rem)] flex flex-col">
      <Header
        title="Mensagens Internas"
        subtitle={currentUser ? "As suas mensagens e avisos" : "Comunicação corporativa e avisos"}
        hideControls={!!currentUser}
      />

      <div className="flex flex-1 gap-6 min-h-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-col md:flex-row">

        {/* Sidebar / List */}
        <div className={`w-full md:w-1/3 flex flex-col border-r border-gray-200 ${selectedMessage ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100 flex flex-col gap-4">
            <button
              onClick={() => setIsComposeOpen(true)}
              className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-brand-700 shadow-sm transition-all"
            >
              <Plus size={18} /> Nova Mensagem
            </button>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Nenhuma mensagem encontrada.
              </div>
            ) : (
              filteredMessages.map(msg => (
                <div
                  key={msg.id}
                  onClick={() => handleReadMessage(msg)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedMessage?.id === msg.id ? 'bg-brand-50 border-l-4 border-l-brand-600' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`font-bold text-sm ${msg.read ? 'text-gray-600' : 'text-gray-900'}`}>
                      {msg.senderId === (currentUser?.id || 'SYSTEM') ? `Para: ${users.find(u => u.id === msg.receiverId)?.name || 'Desconhecido'}` : msg.senderName}
                    </span>
                    <span className="text-xs text-gray-400">{msg.date}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    {msg.priority === 'HIGH' && <AlertCircle size={12} className="text-red-500" />}
                    <h4 className={`text-sm truncate ${msg.read ? 'font-normal text-gray-600' : 'font-bold text-gray-800'}`}>
                      {msg.subject}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{msg.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message Content */}
        <div className={`flex-1 flex flex-col bg-gray-50/50 ${!selectedMessage ? 'hidden md:flex' : 'flex'}`}>
          {selectedMessage ? (
            <div className="flex flex-col h-full">
              <div className="p-6 bg-white border-b border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4 md:hidden">
                  <button onClick={() => setSelectedMessage(null)} className="text-gray-500 hover:text-gray-800 font-medium text-sm flex items-center gap-1">
                    &larr; Voltar
                  </button>
                </div>
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-gray-900">{selectedMessage.subject}</h2>
                  <div className="flex gap-2">
                    {selectedMessage.priority === 'HIGH' && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded flex items-center gap-1">
                        <AlertCircle size={12} /> Urgente
                      </span>
                    )}
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Inbox</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-600">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-800">{selectedMessage.senderName}</p>
                    <p className="text-xs text-gray-500">Para: {users.find(u => u.id === selectedMessage.receiverId)?.name || 'Mim'}</p>
                  </div>
                  <span className="ml-auto text-xs text-gray-400">{selectedMessage.date}</span>
                </div>
              </div>

              <div className="p-8 flex-1 overflow-y-auto bg-white m-4 rounded-lg shadow-sm border border-gray-100">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedMessage.content}</p>
              </div>

              {currentUser && selectedMessage.senderId !== currentUser.id && selectedMessage.senderId !== 'SYSTEM' && (
                <div className="p-4 border-t border-gray-200 bg-white">
                  <button onClick={handleReply} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 text-gray-600">
                    <Send size={16} /> Responder
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <Inbox size={48} className="mb-4 opacity-20" />
              <p>Selecione uma mensagem para ler.</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-brand-600 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><Send size={18} /> Nova Mensagem</h3>
              <button onClick={() => setIsComposeOpen(false)} className="hover:bg-brand-700 p-1 rounded"><Plus size={20} className="rotate-45" /></button>
            </div>

            <form onSubmit={handleSendMessage} className="p-6 space-y-4">

              {/* Send Type Selector (Only for Admin) */}
              {!currentUser && (
                <div className="flex gap-4 border-b border-gray-100 pb-4">
                  <label className={`flex-1 flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-all ${sendType === 'INDIVIDUAL' ? 'bg-brand-50 border-brand-500 text-brand-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    <input type="radio" name="sendType" value="INDIVIDUAL" checked={sendType === 'INDIVIDUAL'} onChange={() => setSendType('INDIVIDUAL')} className="hidden" />
                    <UserIcon size={20} className="mb-1" />
                    <span className="text-xs font-bold">Individual</span>
                  </label>
                  <label className={`flex-1 flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-all ${sendType === 'GROUP' ? 'bg-brand-50 border-brand-500 text-brand-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    <input type="radio" name="sendType" value="GROUP" checked={sendType === 'GROUP'} onChange={() => setSendType('GROUP')} className="hidden" />
                    <Users size={20} className="mb-1" />
                    <span className="text-xs font-bold">Em Massa / Grupo</span>
                  </label>
                </div>
              )}

              {sendType === 'INDIVIDUAL' ? (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Destinatário</label>
                  <SearchableSelect
                    options={[
                      { id: '', label: 'Selecione um colaborador...' },
                      ...users.filter(u => u.id !== currentUser?.id).map(u => ({
                        id: u.id,
                        label: u.name,
                        sublabel: u.role
                      }))
                    ]}
                    value={toUser}
                    onChange={(id) => setToUser(id)}
                    placeholder="Pesquisar colaborador..."
                    className="w-full"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Destinatários (Empresa)</label>
                  <select
                    required={sendType === 'GROUP'}
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 bg-brand-50 border-brand-200 text-brand-900 font-medium"
                  >
                    <option value="ALL">Todas as Empresas (Global)</option>
                    {Object.values(Company).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                    {targetCompany === 'ALL' ? <Globe size={14} /> : <Building2 size={14} />}
                    {targetCompany === 'ALL'
                      ? `Será enviada para ${users.length} colaboradores.`
                      : `Será enviada para ${users.filter(u => u.company === targetCompany).length} colaboradores.`}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assunto</label>
                <input
                  required
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                  placeholder="Assunto da mensagem..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prioridade</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="prio" checked={priority === 'NORMAL'} onChange={() => setPriority('NORMAL')} /> Normal
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer text-red-600 font-medium">
                    <input type="radio" name="prio" checked={priority === 'HIGH'} onChange={() => setPriority('HIGH')} /> Alta Prioridade
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mensagem</label>
                <textarea
                  required
                  rows={5}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                  placeholder="Escreva a sua mensagem..."
                />
              </div>

              {/* WhatsApp Toggle */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 text-green-600 rounded-md">
                      <MessageCircle size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-green-800">Enviar também por WhatsApp</p>
                      <p className="text-[10px] text-green-600">Apenas para colaboradores com número configurado</p>
                    </div>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendWhatsApp}
                      onChange={(e) => setSendWhatsApp(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none ring-0 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" className="px-6 py-2 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 shadow-lg">Enviar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;