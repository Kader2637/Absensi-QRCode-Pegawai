<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Holiday;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class HolidayController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request)
    {
        $search = $request->input('search');
        $limit = $request->input('limit', 10);
        $sort = $request->input('sort', 'date');
        $order = $request->input('order', 'asc');

        $safeSort = in_array($sort, ['name', 'date', 'created_at']) ? $sort : 'date';
        $safeOrder = in_array(strtolower($order), ['asc', 'desc']) ? $order : 'asc';

        $query = Holiday::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('description', 'like', '%' . $search . '%');
            });
        }

        $holidays = $query->orderBy($safeSort, $safeOrder)->paginate($limit);

        return response()->json([
            'success' => true,
            'message' => 'Daftar hari libur berhasil diambil.',
            'data' => $holidays->items(),
            'meta' => [
                'current_page' => $holidays->currentPage(),
                'last_page' => $holidays->lastPage(),
                'per_page' => $holidays->perPage(),
                'total' => $holidays->total(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'date' => 'required|date|unique:holidays,date',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $holiday = Holiday::create([
            'name' => $request->name,
            'date' => $request->date,
            'description' => $request->description,
        ]);

        return $this->successResponse('Hari libur berhasil ditambahkan.', $holiday, 201);
    }

    public function show($id)
    {
        $holiday = Holiday::find($id);

        if (!$holiday) {
            return $this->errorResponse('Hari libur tidak ditemukan.', 404);
        }

        return $this->successResponse('Detail hari libur berhasil diambil.', $holiday);
    }

    public function update(Request $request, $id)
    {
        $holiday = Holiday::find($id);

        if (!$holiday) {
            return $this->errorResponse('Hari libur tidak ditemukan.', 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'date' => 'required|date|unique:holidays,date,' . $id,
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $holiday->update([
            'name' => $request->name,
            'date' => $request->date,
            'description' => $request->description,
        ]);

        return $this->successResponse('Hari libur berhasil diperbarui.', $holiday);
    }

    public function destroy($id)
    {
        $holiday = Holiday::find($id);

        if (!$holiday) {
            return $this->errorResponse('Hari libur tidak ditemukan.', 404);
        }

        $holiday->delete();

        return $this->successResponse('Hari libur berhasil dihapus.');
    }
}
