import apiClient from './client';
import { Step, CreateStepDto, UpdateStepDto } from '../types';

export const stepsApi = {
  getAll: async (): Promise<Step[]> => {
    const response = await apiClient.get<Step[]>('/steps');
    return response.data;
  },

  getOnDate: async (date: string): Promise<Step | null> => {
    const response = await apiClient.get<Step | null>('/steps/on-date', {
      params: { date },
    });
    return response.data;
  },

  create: async (data: CreateStepDto): Promise<Step> => {
    const response = await apiClient.post<Step>('/steps', data);
    return response.data;
  },

  update: async (id: string, data: UpdateStepDto): Promise<Step> => {
    const response = await apiClient.patch<Step>(`/steps/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/steps/${id}`);
  },
};
